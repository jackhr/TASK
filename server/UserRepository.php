<?php

declare(strict_types=1);

final class UserRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function create(array $data): array
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :password_hash)'
        );
        $statement->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password_hash' => $data['passwordHash'],
        ]);

        return $this->findById((int) $this->pdo->lastInsertId()) ??
            throw new RuntimeException('User was created but could not be reloaded.');
    }

    public function findById(int $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, name, email, created_at, updated_at FROM users WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        return $this->mapUser($row);
    }

    public function findAuthByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, name, email, password_hash, created_at, updated_at
             FROM users
             WHERE email = :email
             LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $row = $statement->fetch();

        if (!is_array($row)) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
            'passwordHash' => (string) $row['password_hash'],
            'createdAt' => $this->toIsoString($row['created_at']) ?? '',
            'updatedAt' => $this->toIsoString($row['updated_at']) ?? '',
        ];
    }

    public function emailExists(string $email): bool
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM users WHERE email = :email LIMIT 1');
        $statement->execute(['email' => $email]);

        return (bool) $statement->fetchColumn();
    }

    private function mapUser(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
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
