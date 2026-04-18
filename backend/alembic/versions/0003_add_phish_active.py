"""add phish active

Revision ID: 0003
Revises: 0002_missing_tables
Create Date: 2024-04-17 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002_missing_tables'
branch_labels = None
depends_on = None



def downgrade():
    op.drop_column('phish_templates', 'is_active')
    op.drop_column('phish_templates', 'difficulty')

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('phish_templates')]
    
    if 'difficulty' not in columns:
        op.add_column('phish_templates', sa.Column('difficulty', sa.Integer(), nullable=False, server_default='1'))
    if 'is_active' not in columns:
        op.add_column('phish_templates', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
