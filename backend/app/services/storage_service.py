import boto3
from botocore.client import Config
from app.config import settings

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=f"http://{settings.minio_endpoint}",
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )

def ensure_bucket_exists():
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.minio_bucket)
    except:
        s3.create_bucket(Bucket=settings.minio_bucket)

def upload_file(file_bytes: bytes, object_name: str, content_type: str = "application/pdf"):
    ensure_bucket_exists()
    s3 = get_s3_client()
    s3.put_object(
        Bucket=settings.minio_bucket,
        Key=object_name,
        Body=file_bytes,
        ContentType=content_type
    )
    return object_name

def get_download_url(object_name: str, expires_in: int = 86400):
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.minio_bucket, "Key": object_name},
        ExpiresIn=expires_in
    )
