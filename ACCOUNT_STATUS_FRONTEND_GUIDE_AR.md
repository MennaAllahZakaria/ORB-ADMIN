# دليل الفرونت: تفعيل وتعطيل وإعادة تفعيل الحسابات في ORB

هذا الدليل يشرح لفريق الفرونت كيف يتعامل مع حالات الحساب، وكيف يعرض رسالة التعطيل، وكيف يسمح للمستخدم بإرسال طلب إعادة تفعيل، وكيف يستخدم الأدمن مسارات الإدارة.

## 1. حالات الحساب الأساسية

حقل حالة الحساب هو:

```ts
type AccountStatus = "active" | "inactive" | "banned";
```

| الحالة | المعنى | هل يستطيع المستخدم تسجيل الدخول؟ |
|---|---|---|
| `active` | الحساب يعمل بشكل طبيعي | نعم |
| `inactive` | الحساب معطل مؤقتًا من الإدارة | لا |
| `banned` | الحساب محظور | لا |

> مهم: حالة الحساب `status` منفصلة عن حالة اعتماد المدرس `teacherProfile.verificationStatus`.
>
> - `status`: `active` أو `inactive` أو `banned` — تخص الدخول إلى الحساب.
> - `teacherProfile.verificationStatus`: `pending` أو `approved` أو `rejected` — تخص اعتماد مدرس وليس تفعيل الحساب.

## 2. تسجيل الدخول والتعامل مع الحساب غير النشط

### تسجيل الدخول بالبريد وكلمة المرور

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "********"
}
```

إذا كان الحساب `active`، يرجع login التوكن وبيانات المستخدم كالمعتاد.

إذا كان الحساب `inactive` يرجع السيرفر `403` برسالة قريبة من:

```json
{
  "status": "fail",
  "message": "Your account is inactive"
}
```

إذا كان الحساب `banned` يرجع:

```json
{
  "status": "fail",
  "message": "Your account has been banned"
}
```

### المطلوب في الفرونت عند `403`

1. لا تعرضي خطأ تقنيًا عامًا فقط.
2. افحصي الرسالة أو كود الخطأ.
3. اعرضي للمستخدم شاشة واضحة للحالة.
4. أظهري زر **طلب إعادة تفعيل الحساب**.
5. لا تحاولي استخدام token قديم للحساب؛ الـmiddleware يمنع الحساب غير النشط أو المحظور حتى لو كان معه token قديم.

اقتراح الرسالة:

- `inactive`: "حسابك غير نشط حاليًا. يمكنك إرسال طلب لإعادة التفعيل إلى فريق الإدارة."
- `banned`: "حسابك محظور حاليًا. إذا كنتِ تعتقدين أن هذا القرار غير صحيح، أرسلي طلب مراجعة."

## 3. Google Login

يستخدم الفرونت نفس فكرة التعامل السابقة مع:

```http
POST /auth/google-login
Content-Type: application/json

{
  "idToken": "GOOGLE_ID_TOKEN"
}
```

إذا كان حساب Google موجودًا لكنه `inactive` أو `banned`، سيُرفض الدخول بنفس قواعد حالة الحساب. عند `403` يجب عرض شاشة الحالة وزر طلب إعادة التفعيل أيضًا.

## 4. Route المستخدم لإرسال طلب إعادة التفعيل

هذا الـroute **عام ولا يحتاج JWT**؛ السبب أن المستخدم المعطل أو المحظور لا يستطيع تسجيل الدخول.

```http
POST /auth/reactivation-request
Content-Type: application/json
```

### Body

```json
{
  "email": "user@example.com",
  "reason": "أرغب في إعادة استخدام حسابي وأتعهد بالالتزام بسياسات المنصة."
}
```

### قواعد الفرونت قبل الإرسال

- `email` مطلوب ويجب أن يكون بريدًا صحيحًا.
- `reason` مطلوب وأقل طول له 10 أحرف.
- اعملي `trim()` للحقول قبل إرسالها.
- لا ترسلي password أو token في هذا الطلب.
- استخدمي زر loading لمنع الضغط المتكرر.

### الرد المتوقع

يرجع السيرفر `202` برسالة عامة:

```json
{
  "status": "success",
  "message": "If the account is eligible, the reactivation request will be reviewed by the administration."
}
```

الرسالة عامة عمدًا حتى لا يكشف الـAPI ما إذا كان البريد مرتبطًا بحساب أم لا.

### بعد نجاح الطلب

- اعرضي Toast أو شاشة:

  "تم إرسال طلبك للمراجعة. سيتم اتخاذ القرار من فريق الإدارة."

- لا تعطي وعدًا بأن الحساب سيُفعّل فورًا.
- امنعي إنشاء طلبات متكررة من نفس الشاشة أثناء الإرسال.
- يمكن للمستخدم إعادة المحاولة لاحقًا، لكن السيرفر لا ينشئ أكثر من طلب `pending` لنفس الحساب.

### أخطاء متوقعة

| HTTP | المعنى | تصرف الفرونت |
|---|---|---|
| `400` | البريد أو السبب ناقص، أو السبب أقل من 10 أحرف | اعرضي validation أسفل الحقل |
| `202` | تم قبول الطلب للمراجعة أو تم الرد بشكل عام لأسباب أمنية | اعرضي رسالة الإرسال للمراجعة |
| `429` | تم تجاوز rate limit | اطلبي من المستخدم الانتظار ثم المحاولة |
| `500` | خطأ خادم | اعرضي رسالة مؤقتة ولا تكرري الطلب تلقائيًا بلا حدود |

## 5. Routes الأدمن لتغيير حالة الحساب مباشرة

هذه المسارات تحتاج:

```http
Authorization: Bearer ADMIN_JWT_TOKEN
```

والدور يجب أن يكون `admin` أو `superAdmin`.

### تغيير حالة أي مستخدم

```http
PATCH /admin/users/:userId/status
Content-Type: application/json
Authorization: Bearer ADMIN_JWT_TOKEN

{
  "status": "active"
}
```

القيم المسموحة:

```json
{ "status": "active" }
```

أو:

```json
{ "status": "inactive" }
```

أو:

```json
{ "status": "banned" }
```

### أمثلة استخدام

تعطيل حساب:

```http
PATCH /admin/users/USER_ID/status

{ "status": "inactive" }
```

حظر حساب:

```http
PATCH /admin/users/USER_ID/status

{ "status": "banned" }
```

إعادة تفعيل مباشرة من قائمة المستخدمين:

```http
PATCH /admin/users/USER_ID/status

{ "status": "active" }
```

### قواعد مهمة في شاشة الأدمن

- اعرضي `status` في بطاقة كل طالب ومدرس.
- لا تخلطيه مع `teacherProfile.verificationStatus`.
- زر تغيير حالة حساب المدرس مستقل عن زر اعتماد الشهادة.
- الأدمن لا يستطيع تغيير حالة حسابه بنفسه.
- الأدمن العادي لا يستطيع تغيير حالة `admin` أو `superAdmin`؛ ذلك محصور في `superAdmin` حسب قواعد الـBackend.

## 6. Routes طلبات إعادة التفعيل في Admin

### عرض الطلبات المعلقة

```http
GET /admin/account-reactivation-requests?status=pending&page=1&limit=100
Authorization: Bearer ADMIN_JWT_TOKEN
```

القيم الممكنة لـ`status`:

- `pending`
- `approved`
- `rejected`

الرد يكون بالشكل التالي:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "REQUEST_ID",
      "email": "user@example.com",
      "reason": "أرغب في إعادة استخدام حسابي...",
      "requestedStatus": "inactive",
      "status": "pending",
      "user": {
        "_id": "USER_ID",
        "firstName": "User",
        "lastName": "Name",
        "email": "user@example.com",
        "role": "student",
        "status": "inactive"
      },
      "createdAt": "2026-09-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1,
    "totalPages": 1
  }
}
```

### حسم الطلب

```http
PATCH /admin/account-reactivation-requests/:requestId/resolve
Content-Type: application/json
Authorization: Bearer ADMIN_JWT_TOKEN
```

#### الموافقة

```json
{
  "decision": "approved",
  "adminNote": "تمت مراجعة الطلب وإعادة تفعيل الحساب."
}
```

النتيجة:

- حالة الطلب تصبح `approved`.
- حالة المستخدم تصبح `active`.
- يستطيع المستخدم تسجيل الدخول من جديد.
- القرار يسجل في Audit Log.

#### الرفض

```json
{
  "decision": "rejected",
  "adminNote": "يرجى التواصل مع الدعم وإرفاق بيانات إضافية."
}
```

النتيجة:

- حالة الطلب تصبح `rejected`.
- حالة المستخدم لا تتغير وتظل `inactive` أو `banned`.
- لا يستطيع المستخدم تسجيل الدخول.
- القرار يسجل في Audit Log.

### حالات الحسم

| HTTP | المعنى |
|---|---|
| `200` | تم حفظ قرار الأدمن |
| `400` | `decision` غير صحيح أو البيانات غير صالحة |
| `404` | الطلب غير موجود أو تم حسمه سابقًا |
| `401` | لا يوجد JWT صالح |
| `403` | الحساب الحالي ليس Admin أو Super Admin |
| `500` | خطأ خادم |

> لا تسمحي للواجهة بإعادة إرسال قرار لنفس الطلب بعد نجاحه؛ احذفيه من قائمة `pending` أو أعيدي تحميل القائمة.

## 7. تدفق الواجهة المقترح بالكامل

```text
Login / Google Login
        |
        |-- 200 --> ادخل إلى التطبيق
        |
        |-- 403 inactive/banned --> شاشة حالة الحساب
                                      |
                                      --> نموذج email + reason
                                             |
                                             POST /auth/reactivation-request
                                             |
                                             --> رسالة: الطلب قيد المراجعة

Admin Dashboard
        |
        --> GET /admin/account-reactivation-requests?status=pending
                |
                --> مراجعة السبب
                        |
                        |-- approved --> PATCH .../resolve
                        |                    decision=approved
                        |                    --> user.status = active
                        |
                        |-- rejected --> PATCH .../resolve
                                             decision=rejected
                                             --> user.status كما هو
```

## 8. ملاحظات مهمة للفريق

1. لا تعتمدي على إخفاء الزر فقط؛ الـBackend هو مصدر الصلاحية النهائي.
2. لا تخزني قرار إعادة التفعيل في Local Storage على أنه حقيقة نهائية؛ أعيدي قراءة حالة المستخدم بعد login.
3. بعد نجاح الموافقة، المستخدم يحتاج تسجيل دخول جديد أو إعادة محاولة login.
4. إذا كانت شاشة التطبيق تعتمد على `GET /auth/me`، فالحساب غير النشط سيرجع `403` من middleware؛ أعيدي المستخدم إلى شاشة الحالة بدل تركه في شاشة تحميل لا نهائية.
5. عند تغيير الحالة من الأدمن، حدّثي الصف محليًا بعد نجاح الـAPI حتى لا يظهر status قديمًا.
6. في حالة المدرس، اعرضي badge للحساب وbadge منفصلًا لاعتماد الشهادة.
