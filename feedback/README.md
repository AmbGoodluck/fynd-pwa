# Fynd — User Feedback

All feedback submitted through the app is stored in **Firebase Firestore**.

## Access remotely

Firebase Console (requires project access):
```
https://console.firebase.google.com/project/fynd-app-42ef4/firestore/data/feedback
```

Project ID: `fynd-app-42ef4`
Collection:  `feedback`

---

## Document schema

| Field       | Type        | Values                              | Notes                        |
|-------------|-------------|-------------------------------------|------------------------------|
| `type`      | `string`    | `"quick"` \| `"rating"`            | Which feedback form was used |
| `sentiment` | `string?`   | `"love"` \| `"better"` \| `"issue"`| Only present when type=quick |
| `comment`   | `string?`   | Free text                           | Optional user comment        |
| `rating`    | `number?`   | `1` – `5`                           | Only present when type=rating|
| `platform`  | `string`    | `"ios"` \| `"android"`             | Device platform              |
| `createdAt` | `Timestamp` | Firestore server timestamp          | UTC, auto-set on write       |

### Example documents

```json
// Quick feedback
{
  "type": "quick",
  "sentiment": "issue",
  "comment": "Map doesn't load on my phone",
  "platform": "android",
  "createdAt": "2026-03-03T14:22:00Z"
}

// Star rating
{
  "type": "rating",
  "rating": 5,
  "platform": "ios",
  "createdAt": "2026-03-03T09:10:00Z"
}
```

---

## Firestore security rules

The `feedback` collection must allow **anonymous writes** (no auth required in V1).
Add the following rule in the Firebase Console → Firestore → Rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Feedback: anyone can write, nobody can read (admin console only)
    match /feedback/{docId} {
      allow create: if request.resource.data.keys().hasAll(['type', 'platform', 'createdAt'])
                    && request.resource.data.type in ['quick', 'rating'];
      allow read, update, delete: if false;
    }

    // All other collections remain locked
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Export feedback data

From the Firebase Console you can export the collection as CSV/JSON, or use the Firebase CLI:

```bash
# Install CLI if needed
npm install -g firebase-tools
firebase login

# Export feedback collection
firebase firestore:export gs://fynd-app-42ef4.firebasestorage.app/exports/feedback \
  --project fynd-app-42ef4 \
  --collection-ids=feedback
```
