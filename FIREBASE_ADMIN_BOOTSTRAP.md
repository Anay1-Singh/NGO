# ServeBase First Admin Bootstrap

This is a trusted manual provisioning procedure for the first ServeBase administrator. It is not a public registration flow and it does not create a permanent Security Rules exception.

## 1. Confirm project and organization

1. Open the Firebase Console and select project `ngo-01-c62cb`.
2. Open Firestore Database and confirm the default database is in `asia-south2`.
3. Use organization ID `servebase-main` for version one.
4. Confirm `.env.local` contains the exact Web App configuration and `VITE_ORGANIZATION_ID=servebase-main` locally. Do not commit the file.

## 2. Create the organization document

Using a trusted operator workflow with Firestore access, create:

```text
organizations/servebase-main
```

Required initial fields:

```text
name: ServeBase
slug: servebase
timezone: Asia/Kolkata
currency: INR
adminName: <first administrator name>
adminEmail: <first administrator email>
status: active
createdAt: <Firestore server timestamp>
updatedAt: <Firestore server timestamp>
```

Optional fields are `phone` and `address`. Do not create a broad client rule that allows anyone to create an organization.

## 3. Create the first Auth account

1. In Firebase Console, open Authentication → Users.
2. Add the first administrator using Email/Password.
3. Record the generated Auth UID. Do not place a password or service-account credential in the repository.

## 4. Provision the admin member

Using the trusted provisioning workflow, create:

```text
organizations/servebase-main/members/{authUid}
```

Required fields:

```text
uid: <Auth UID>
email: <normalized account email>
displayName: <administrator name>
role: admin
status: active
providerIds: [password]
createdAt: <Firestore server timestamp>
updatedAt: <Firestore server timestamp>
```

The member document ID must equal the Firebase Auth UID. Do not allow a client to assign itself `admin` or `coordinator`.

## 5. Verify

1. Sign in through the ServeBase admin route.
2. Confirm the application resolves the Auth UID to the active admin member.
3. Confirm the organization status is `active`.
4. Confirm the admin dashboard is accessible.
5. Confirm no volunteer, donor, donation, drive, participation or activity records were created by bootstrap.

Security Rules should be deployed only after the organization and first admin member are provisioned through the trusted process and emulator tests pass. No permanent “if there are no members, allow admin” rule is permitted.

## Deferred trusted services

Trusted audit records, reconciliation jobs, server-side projection repair and administrative automation remain deferred while the project is on Spark and no trusted backend is configured. Firebase Storage uploads are also deferred.
