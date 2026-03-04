<?php

declare(strict_types=1);

final class TaskRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function getAllWithCompletions(string $fromDate, string $toDate): array
    {
        $statement = $this->pdo->query(
            'SELECT id, title, description, created_at, updated_at FROM tasks ORDER BY created_at ASC, title ASC'
        );
        $tasks = [];

        foreach ($statement->fetchAll() as $row) {
            $taskId = (int) $row['id'];
            $tasks[$taskId] = $this->mapTask($row, []);
        }

        if ($tasks === []) {
            return [];
        }

        $completionDates = $this->loadCompletionDates(array_keys($tasks), $fromDate, $toDate);

        foreach ($tasks as $taskId => $task) {
            $tasks[$taskId]['completionDates'] = $completionDates[$taskId] ?? [];
        }

        return array_values($tasks);
    }

    public function find(int $id, ?string $fromDate = null, ?string $toDate = null): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, title, description, created_at, updated_at FROM tasks WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $task = $statement->fetch();

        if (!is_array($task)) {
            return null;
        }

        $completionDates = [];

        if ($fromDate !== null && $toDate !== null) {
            $completionDates = $this->loadCompletionDates([$id], $fromDate, $toDate)[$id] ?? [];
        }

        return $this->mapTask($task, $completionDates);
    }

    public function create(array $data): array
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO tasks (title, description) VALUES (:title, :description)'
        );
        $statement->execute([
            'title' => $data['title'],
            'description' => $data['description'],
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
        $this->pdo->beginTransaction();

        try {
            $completionStatement = $this->pdo->prepare('DELETE FROM task_completions WHERE task_id = :id');
            $completionStatement->execute(['id' => $id]);

            $taskStatement = $this->pdo->prepare('DELETE FROM tasks WHERE id = :id');
            $taskStatement->execute(['id' => $id]);

            $this->pdo->commit();

            return $taskStatement->rowCount() > 0;
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }
    }

    public function setCompletion(int $taskId, string $date, bool $completed): ?array
    {
        if ($this->find($taskId) === null) {
            return null;
        }

        if ($completed) {
            $statement = $this->pdo->prepare(
                'INSERT INTO task_completions (task_id, completed_on) VALUES (:task_id, :completed_on)
                 ON DUPLICATE KEY UPDATE completed_on = VALUES(completed_on)'
            );
            $statement->execute([
                'task_id' => $taskId,
                'completed_on' => $date,
            ]);
        } else {
            $statement = $this->pdo->prepare(
                'DELETE FROM task_completions WHERE task_id = :task_id AND completed_on = :completed_on'
            );
            $statement->execute([
                'task_id' => $taskId,
                'completed_on' => $date,
            ]);
        }

        return $this->find($taskId, $date, $date);
    }

    private function mapTask(array $row, array $completionDates): array
    {
        return [
            'id' => (int) $row['id'],
            'title' => (string) $row['title'],
            'description' => $row['description'] === null ? '' : (string) $row['description'],
            'completionDates' => $completionDates,
            'createdAt' => $this->toIsoString($row['created_at']) ?? '',
            'updatedAt' => $this->toIsoString($row['updated_at']) ?? '',
        ];
    }

    private function loadCompletionDates(array $taskIds, string $fromDate, string $toDate): array
    {
        if ($taskIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($taskIds), '?'));
        $statement = $this->pdo->prepare(
            sprintf(
                'SELECT task_id, completed_on
                 FROM task_completions
                 WHERE task_id IN (%s) AND completed_on BETWEEN ? AND ?
                 ORDER BY completed_on ASC',
                $placeholders
            )
        );
        $statement->execute([...$taskIds, $fromDate, $toDate]);

        $completionDates = [];

        foreach ($statement->fetchAll() as $row) {
            $taskId = (int) $row['task_id'];
            $completionDates[$taskId] ??= [];
            $completionDates[$taskId][] = (string) $row['completed_on'];
        }

        return $completionDates;
    }

    private function toIsoString(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (new DateTimeImmutable($value))->format(DATE_ATOM);
    }
}
