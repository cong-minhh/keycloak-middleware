# 🔐 Keycloak Admin REST API Endpoints

This document provides a categorized reference for common Keycloak Admin REST API endpoints used for realm, user, role, client, and security management.

---

## 🔹 Realm (Tenant) Management

| Method | Path | Description              |
|--------|------|--------------------------|
| GET    | /admin/realms                  | List all realms           |
| POST   | /admin/realms                  | Create a new realm        |
| GET    | /admin/realms/{realm}          | Get realm config          |
| PUT    | /admin/realms/{realm}          | Update a realm            |
| DELETE | /admin/realms/{realm}          | Delete a realm            |

---

## 🔹 User Management

| Method | Path | Description                      |
|--------|------|----------------------------------|
| GET    | /admin/realms/{realm}/users            | List users                 |
| POST   | /admin/realms/{realm}/users            | Create user                |
| GET    | /admin/realms/{realm}/users/{id}       | Get user info              |
| PUT    | /admin/realms/{realm}/users/{id}       | Update user                |
| DELETE | /admin/realms/{realm}/users/{id}       | Delete user                |
| PUT    | /admin/realms/{realm}/users/{id}/reset-password | Set/reset password      |
| PUT    | /admin/realms/{realm}/users/{id}/send-verify-email | Trigger verify email |
| GET    | /admin/realms/{realm}/users/{id}/sessions | Get user sessions       |
| DELETE | /admin/realms/{realm}/users/{id}/sessions | Logout user              |

---

## 🔹 Role & Group Assignment

| Method | Path | Description                      |
|--------|------|----------------------------------|
| GET    | /admin/realms/{realm}/roles            | List roles                 |
| POST   | /admin/realms/{realm}/roles            | Create role                |
| GET    | /admin/realms/{realm}/groups           | List groups                |
| POST   | /admin/realms/{realm}/users/{id}/role-mappings/realm | Assign roles to user |
| PUT    | /admin/realms/{realm}/users/{id}/groups/{groupId} | Assign user to group   |

---

## 🔹 Organization



## 🔹 Client Management

| Method | Path | Description                      |
|--------|------|----------------------------------|
| GET    | /admin/realms/{realm}/clients          | List clients               |
| POST   | /admin/realms/{realm}/clients          | Create new client          |
| GET    | /admin/realms/{realm}/clients/{id}     | Get client details         |
| PUT    | /admin/realms/{realm}/clients/{id}     | Update client              |
| DELETE | /admin/realms/{realm}/clients/{id}     | Delete client              |

---

#TODO: 
## 🔹 Advanced (Security & Monitoring)

| Method | Path | Description                      |
|--------|------|----------------------------------|
| POST   | /admin/realms/{realm}/attack-detection/brute-force/users/{id}/clear | Unlock user |
| GET    | /admin/serverinfo                     | Get server details         |
| GET    | /admin/events                         | Audit logs (if enabled)    |
