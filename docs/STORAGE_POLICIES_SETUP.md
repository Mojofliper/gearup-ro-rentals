# Storage Policies Setup Guide

## Claim Photos Bucket Policies

The `claim-photos` bucket has been created, but the storage policies need to be set up manually through the Supabase dashboard.

### Steps to Create Storage Policies:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to Storage → Policies

2. **Select the `claim-photos` bucket**

3. **Create the following policies:**

#### Policy 1: Users can upload claim photos

- **Policy Name**: `Users can upload claim photos`
- **Allowed Operation**: INSERT
- **Policy Definition**:

```sql
bucket_id = 'claim-photos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 2: Users can view claim photos

- **Policy Name**: `Users can view claim photos`
- **Allowed Operation**: SELECT
- **Policy Definition**:

```sql
bucket_id = 'claim-photos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 3: Users can update claim photos

- **Policy Name**: `Users can update claim photos`
- **Allowed Operation**: UPDATE
- **Policy Definition**:

```sql
bucket_id = 'claim-photos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

#### Policy 4: Users can delete claim photos

- **Policy Name**: `Users can delete claim photos`
- **Allowed Operation**: DELETE
- **Policy Definition**:

```sql
bucket_id = 'claim-photos' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### How the Policies Work:

- **Folder Structure**: Files are stored as `claim-photos/{user_id}/{filename}`
- **Access Control**: Users can only access files in their own folder
- **Security**: `auth.uid()::text = (storage.foldername(name))[1]` ensures users can only access their own claim photos

### Testing the Policies:

After setting up the policies, you can test them by:

1. Creating a claim with photos
2. Verifying that only the claim owner can view/upload/update/delete their photos
3. Confirming that other users cannot access the photos

### Note:

These policies ensure that claim evidence photos are properly secured and users can only access their own claim photos.
