"""initial schema

Revision ID: 0001_initial
"""

from alembic import context, op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from passlib.context import CryptContext
import os

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == 'postgresql'

    if is_postgres:
        op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    # Helper for cross-dialect UUID primary key
    def get_uuid_col(primary_key=False, server_default=None, **kwargs):
        if is_postgres:
            return sa.Column(
                "id" if primary_key else kwargs.get("name"),
                postgresql.UUID(as_uuid=True),
                primary_key=primary_key,
                server_default=sa.text("gen_random_uuid()") if primary_key and not server_default else server_default,
                **{k: v for k, v in kwargs.items() if k != "name"}
            )
        else:
            return sa.Column(
                "id" if primary_key else kwargs.get("name"),
                sa.Uuid(),
                primary_key=primary_key,
                **{k: v for k, v in kwargs.items() if k != "name"}
            )

    op.create_table(
        "admins",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("last_login", sa.TIMESTAMP(timezone=True)),
        sa.CheckConstraint("role IN ('superadmin', 'instructor')", name="ck_admin_role"),
    )
    
    op.create_table(
        "organisations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sector", sa.Text()),
        sa.Column("contact", sa.Text()),
        sa.Column("email", sa.Text()),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("admins.id")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("org_id", sa.Uuid(), sa.ForeignKey("organisations.id")),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("admins.id")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("join_code", sa.Text(), nullable=False, unique=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("scheduled_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("ended_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('draft','ready','live','ended')", name="ck_session_status"),
    )
    
    op.create_table(
        "participants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("joined_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("ip_address", sa.Text()),
        sa.Column("user_agent", sa.Text()),
        sa.UniqueConstraint("email", "session_id"),
    )
    op.create_index("idx_participants_session", "participants", ["session_id"])
    
    op.create_table(
        "challenges",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.Text()),
        sa.Column("points", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()) if is_postgres else sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("TRUE")),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("admins.id")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    
    op.create_table(
        "session_challenges",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id")),
        sa.Column("challenge_id", sa.Uuid(), sa.ForeignKey("challenges.id")),
        sa.Column("order_num", sa.Integer(), nullable=False),
        sa.Column("unlocked_at", sa.TIMESTAMP(timezone=True)),
        sa.UniqueConstraint("session_id", "challenge_id"),
    )
    op.create_index("idx_session_challenges", "session_challenges", ["session_id"])

    # Seed initial superadmin
    password = pwd_context.hash(os.getenv("SEED_ADMIN_PASSWORD", "ChangeMe_Immediately_2024!"))
    admin_sql = sa.text(
        """
        INSERT INTO admins (id, full_name, email, password, role)
        VALUES (:id, :full_name, :email, :password, 'superadmin')
        """
    )
    # We provide a manual UUID for the seed to work across dialects without gen_random_uuid
    op.get_bind().execute(
        admin_sql,
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "full_name": "CSA Platform Admin",
            "email": os.getenv("SEED_ADMIN_EMAIL", "admin@csa.gov.gh"),
            "password": password,
        },
    )


def downgrade() -> None:
    for table in [
        "session_challenges",
        "challenges",
        "participants",
        "sessions",
        "organisations",
        "admins",
    ]:
        op.drop_table(table)
