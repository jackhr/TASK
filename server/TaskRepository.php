<?php

declare(strict_types=1);

final class TaskRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function getAll(?string $status = null, ?string $search = null): array
    {
        $sql = <<<SQL
            SELECT id, title, description, status, priority, due_date, created_at, updated_at
            FROM tasks
        SQL;

        $conditions = [];
        $params = [];

        if ($status !== null && $status !== '') {
            $conditions[] = 'status = :status';
            $params['status'] = $status;
        }

        if ($search !== null && $search !== '') {
            $conditions[] = '(title LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($conditions !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= <<<SQL
             ORDER BY
                CASE status
                    WHEN 'todo' THEN 1
                    WHEN 'in_progress' THEN 2
                    ELSE 3
                END,
                CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                due_date ASC,
                created_at DESC
        SQL;

        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return array_map(fn (array $row): array => $this->mapTask($row), $statement->fetchAll());
    }

    public function find(int $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, title, description, status, priority, due_date, created_at, updated_at FROM tasks WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $task = $statement->fetch();

        return is_array($task) ? $this->mapTask($task) : null;
    }

    public function create(array $data): array
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO tasks (title, description, status, priority, due_date) VALUES (:title, :description, :status, :priority, :due_date)'
        );
        $statement->execute([
            'title' => $data['title'],
            'description' => $data['description'],
            'status' => $data['status'],
            'priority' => $data['priority'],
            'due_date' => $data['due_date'],
        ]);

        return $this->find((int) $this->pdo->lastInsertId()) ?? throw new RuntimeException('Task was created but could not be reloaded.');
    }

    public function update(int $id, array $data): ?array
    {
        if ($data === []) {
            return $this->find($id);
        }

        $assignments = [];
        $params = ['id' => $id];

        foreach ($data as $column => $value) {
            $assignments[] = sprintf('%s = :%s', $column, $column);
            $params[$column] = $value;
        }

        $assignments[] = 'updated_at = CURRENT_TIMESTAMP';

        $statement = $this->pdo->prepare(
            sprintf('UPDATE tasks SET %s WHERE id = :id', implode(', ', $assignments))
        );
        $statement->execute($params);

        if ($statement->rowCount() === 0 && $this->find($id) === null) {
            return null;
        }

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $statement = $this->pdo->prepare('DELETE FROM tasks WHERE id = :id');
        $statement->execute(['id' => $id]);

        return $statement->rowCount() > 0;
    }

    private function mapTask(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'title' => (string) $row['title'],
            'description' => $row['description'] === null ? '' : (string) $row['description'],
            'status' => (string) $row['status'],
            'priority' => (string) $row['priority'],
            'dueDate' => $this->toIsoString($row['due_date']),
            'createdAt' => $this->toIsoString($row['created_at']) ?? '',
            'updatedAt' => $this->toIsoString($row['updated_at']) ?? '',
        ];
    }

    private function toIsoString(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (new DateTimeImmutable($value))->format(DATE_ATOM);
    }
}

