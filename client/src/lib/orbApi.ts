export type ApiUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "admin" | "teacher" | "student" | string;
  imageProfile?: string;
  phone?: string;
  status?: "active" | "inactive" | "banned" | string;
  createdAt?: string;
  teacherProfile?: {
    verificationStatus?: "pending" | "approved" | "rejected" | string;
    subjects?: string[];
    academic_stages?: string[];
    certificate?: string;
    education_system?: string;
  };
  studentProfile?: Record<string, unknown>;
};

export type ApiLesson = {
  _id: string;
  title?: string;
  subject?: string;
  price?: number;
  durationInMinutes?: number;
  status?: string;
  paymentStatus?: string;
  fundsStatus?: string;
  reviewStatus?: string;
  finalCompletionStatus?: string;
  disputeFlag?: boolean;
  requestedDate?: string;
  student?: ApiUser | string;
  acceptedTeacher?: ApiUser | string;
};

export type ApiPayout = {
  _id: string;
  amount?: number;
  status?: "pending" | "processing" | "completed" | "failed" | string;
  method?: "wallet" | "bank" | string;
  teacherId?: { _id?: string; firstName?: string; lastName?: string; email?: string } | string;
};

export type ApiSupportTicket = {
  _id: string;
  user?: { _id?: string; firstName?: string; lastName?: string; email?: string } | string;
  problemType?: string;
  message?: string;
  status?: "open" | "in progress" | "closed" | string;
  image?: string;
  createdAt?: string;
};

export type ApiNotification = {
  _id: string;
  title?: string;
  message?: string;
  read?: boolean;
  recipient?: { _id?: string; firstName?: string; lastName?: string; email?: string } | string;
  createdAt?: string;
};

export type ApiDispute = {
  _id: string;
  lessonId?: { _id?: string; title?: string; subject?: string; price?: number } | string;
  studentId?: string;
  teacherId?: string;
  reason?: "no_show" | "quality" | "technical" | "other" | string;
  description?: string;
  evidence?: Array<{ type?: string; url?: string }>;
  status?: "open" | "under_review" | "resolved" | string;
  resolution?: { decision?: "refund" | "release" | "partial" | string; amount?: number; note?: string };
  createdAt?: string;
};

export type ApiDashboardSummary = {
  generatedAt?: string;
  counts: {
    pendingTeachers: number;
    teacherTotal: number;
    studentTotal: number;
    lessonIssues: number;
    openDisputes: number;
    pendingPayouts: number;
    openSupportTickets: number;
  };
  queues: {
    pendingTeachers: ApiUser[];
    openDisputes: ApiDispute[];
    pendingPayouts: ApiPayout[];
  };
};

export type ApiAuditLog = {
  _id: string;
  actorId?: ApiUser | string | null;
  actorRole?: ApiUser["role"];
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestId?: string;
  createdAt?: string;
};

export type ApiPagination = { page: number; limit: number; total: number; totalPages: number };

export type ApiDisputedLesson = ApiLesson & {
  student?: ApiUser | string;
  acceptedTeacher?: ApiUser | string;
  paymentStatus?: string;
  adminNote?: string;
  completedAt?: string;
  updatedAt?: string;
};

export type ApiEnvelope<T> = { status?: string; message?: string; data?: T; results?: number; pagination?: ApiPagination };

const apiBaseUrl = (import.meta.env.VITE_ORB_API_BASE_URL ?? "").replace(/\/$/, "");

export class OrbApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "OrbApiError";
  }
}

export function getOrbApiBaseUrl() {
  return apiBaseUrl;
}

export async function orbApi<T>(
  path: string,
  options: { token?: string | null; method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<ApiEnvelope<T>> {
  if (!apiBaseUrl) throw new OrbApiError("لم يتم ضبط عنوان ORB API.", 0);

  const headers: HeadersInit = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok) throw new OrbApiError(payload.message ?? "تعذر إتمام الطلب إلى ORB API.", response.status);
  return payload;
}

export function fullName(user?: Pick<ApiUser, "firstName" | "lastName" | "email"> | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || user?.email || "مستخدم ORB";
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "؟";
}
