# Recipe Creation App — Backend

FastAPI · PostgreSQL · SQLAlchemy · Alembic

---

## Prerequisites

- Python 3.11+
- Docker + Colima (or Docker Desktop)
- `brew install colima docker docker-compose`

---

## First-time Setup

**1. Start Colima and the database**
```bash
colima start --cpu 2 --memory 2 --disk 5
docker compose up db -d
```

**2. Create and activate the virtual environment**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**3. Create `.env`**
```bash
echo "DATABASE_URL=postgresql://recipe:recipe@127.0.0.1:5433/recipe_db" > .env
```

**4. Generate and apply migrations**
```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

**5. Start the server**
```bash
uvicorn main:app --reload
```

On startup the app will automatically seed:
- `user1` and `user2` (password: `password`)
- Step types, properties, conditions, and validation rules

| Endpoint       | URL                        |
|----------------|----------------------------|
| API            | http://127.0.0.1:8000      |
| Interactive docs | http://127.0.0.1:8000/docs |

---

## Subsequent Runs

```bash
colima start
docker compose up db -d
source .venv/bin/activate
uvicorn main:app --reload
```

---

## Migrations

```bash
# After changing a model
alembic revision --autogenerate -m "describe change"
alembic upgrade head

# Roll back one migration
alembic downgrade -1
```

---

## Verify Database

```bash
docker compose exec db psql -U recipe -d recipe_db
```
```sql
SELECT login FROM users;
SELECT name FROM step_types;
SELECT key, input_type FROM property_definitions ORDER BY step_type_id, "order";
\q
```
