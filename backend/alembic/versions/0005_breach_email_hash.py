"""breach email hash

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-18 14:41:00.000000

"""
from alembic import op
import sqlalchemy as sa
import os

# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add email_hash column (nullable initially for backfill)
    op.add_column('breach_check_events', sa.Column('email_hash', sa.String(length=64), nullable=True))
    
    # 2. Backfill using pgcrypto (already enabled in migration 0001)
    pepper = os.environ.get("BREACH_PEPPER", "")
    if not pepper:
        # Fallback if variable is missing to avoid migration crash, 
        # though plan says it must be present.
        print("WARNING: BREACH_PEPPER environment variable not set during migration!")
    
    connection = op.get_bind()
    connection.execute(sa.text(
        "UPDATE breach_check_events SET email_hash = encode(digest(lower(trim(email_checked)) || :pepper, 'sha256'), 'hex')"
    ), {"pepper": pepper})
    
    # 3. Make email_hash NOT NULL after backfill
    op.alter_column('breach_check_events', 'email_hash', nullable=False)
    
    # 4. Add index on email_hash
    op.create_index('ix_breach_check_events_email_hash', 'breach_check_events', ['email_hash'])
    
    # 5. Drop the raw email column
    op.drop_column('breach_check_events', 'email_checked')


def downgrade() -> None:
    # Add back email_checked (nullable since we can't reverse the hash)
    op.add_column('breach_check_events', sa.Column('email_checked', sa.Text(), nullable=True))
    
    # Drop email_hash and its index
    op.drop_index('ix_breach_check_events_email_hash', table_name='breach_check_events')
    op.drop_column('breach_check_events', 'email_hash')
