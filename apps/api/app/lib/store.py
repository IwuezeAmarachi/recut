# In-memory stores — swap for a real DB (Postgres via SQLAlchemy) in production
project_store: dict = {}
media_store: dict = {}   # { project_id: { media_id: MediaItemOut dict } }
export_store: dict = {}  # { job_id: ExportJobOut dict }
