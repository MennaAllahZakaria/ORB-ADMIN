/**
 * Style reminder — ORB «دفتر المنارة»:
 * RTL, no centered marketing hero, and calm card-led decision surfaces.
 * Blue is for action, gold for attention, teal for stability. Content uses realistic API-shaped preview data.
 */
import OrbLogo from "@/components/OrbLogo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrbAuth } from "@/contexts/OrbAuthContext";
import { orbImageUrl } from "@/lib/orbAssets";
import { buildDisputeResolution, canAdminResolveLesson, canFinalizeTeacherReview, isLessonAdminResolved } from "@/lib/adminOperations";
import { ApiAuditLog, ApiDashboardSummary, ApiDispute, ApiDisputedLesson, ApiLesson, ApiNotification, ApiPayout, ApiReactivationRequest, ApiSupportTicket, ApiUser, fullName, initials, orbApi } from "@/lib/orbApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowUpLeft,
  BadgeCheck,
  Bell,
  BookOpenText,
  Check,
  ChevronLeft,
  CircleDollarSign,
  CircleHelp,
  CircleUserRound,
  Clock3,
  FileCheck2,
  ExternalLink,
  Gavel,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type NavigationKey =
  | "dashboard"
  | "teachers"
  | "students"
  | "issues"
  | "disputedLessons"
  | "disputes"
  | "payouts"
  | "reactivation"
  | "support"
  | "notifications"
  | "admins"
  | "audit"
  | "settings";

type Teacher = {
  id: string;
  name: string;
  subject: string;
  city: string;
  initials: string;
  tone: string;
  submitted: string;
  documents: number;
  status: "pending" | "approved" | "rejected";
  accountStatus: "active" | "inactive" | "banned";
  certificate?: string;
  email?: string;
};

const navigation = [
  { id: "dashboard" as const, label: "نظرة عامة", icon: LayoutDashboard },
  { id: "teachers" as const, label: "المدرسون", icon: GraduationCap },
  { id: "students" as const, label: "الطلاب", icon: Users },
  { id: "issues" as const, label: "الدروس محل المراجعة", icon: TriangleAlert },
  { id: "disputedLessons" as const, label: "الحصص المتنازع عليها", icon: Gavel },
  { id: "disputes" as const, label: "النزاعات", icon: CircleDollarSign },
  { id: "payouts" as const, label: "التحويلات المالية", icon: WalletCards },
  { id: "reactivation" as const, label: "طلبات إعادة التفعيل", icon: UserCheck },
  { id: "support" as const, label: "طلبات الدعم", icon: LifeBuoy },
  { id: "notifications" as const, label: "الإشعارات", icon: Bell },
  { id: "admins" as const, label: "فريق الإدارة", icon: ShieldCheck },
  { id: "audit" as const, label: "سجل التدقيق", icon: ScrollText },
];

const iconButtonClass =
  "grid h-10 w-10 place-items-center rounded-xl border border-[#E1E8F1] bg-white text-[#55657A] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B9CDEA] hover:text-[#1769D5] active:scale-[0.97]";

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-[#1769D5]">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-[#102A4B] sm:text-[28px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-xl text-xs leading-6 text-[#68778B] sm:text-[13px]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function MiniAvatar({ teacher, size = "md" }: { teacher: Teacher; size?: "sm" | "md" }) {
  const sizes = size === "sm" ? "h-9 w-9 text-[10px]" : "h-11 w-11 text-xs";
  return (
    <div
      aria-label={`صورة رمزية لـ ${teacher.name}`}
      className={`grid ${sizes} shrink-0 place-items-center rounded-2xl font-bold ${teacher.tone}`}
    >
      {teacher.initials}
    </div>
  );
}

function KpiCard({
  label,
  value,
  support,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  support: string;
  icon: typeof Users;
  accent: "blue" | "gold" | "teal";
}) {
  const accents = {
    blue: "bg-[#E6F0FF] text-[#1769D5]",
    gold: "bg-[#FFF4D7] text-[#B87A00]",
    teal: "bg-[#E2F5EE] text-[#16785B]",
  };
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#E5EBF2] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(25,61,101,0.08)]">
      <span className="absolute inset-x-5 top-0 h-0.5 bg-[#1769D5]/0 transition-all duration-200 group-hover:bg-[#1769D5]" />
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${accents[accent]}`}>
          <Icon size={20} strokeWidth={1.9} />
        </div>
        <span className="text-[10px] font-semibold text-[#6E7B8E]">البيانات الحالية</span>
      </div>
      <p className="mt-5 text-xs font-medium text-[#647386]">{label}</p>
      <p dir="ltr" className="mt-1.5 text-right font-display text-[30px] font-bold tracking-[-0.06em] text-[#102A4B]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#8290A1]">{support}</p>
    </article>
  );
}

function StatusPill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "gold" | "red" | "teal" }) {
  const tones = {
    blue: "bg-[#E8F1FF] text-[#1769D5]",
    gold: "bg-[#FFF4D6] text-[#A76D00]",
    red: "bg-[#FDEBEC] text-[#B12D3B]",
    teal: "bg-[#E1F5EE] text-[#127054]",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

function EmptySection({ section }: { section: string }) {
  return (
    <section className="orb-enter grid min-h-[460px] place-items-center rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-8 text-center soft-shadow">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#EAF2FF] text-[#1769D5]">
          <Sparkles size={28} />
        </div>
        <h2 className="font-display mt-5 text-2xl font-bold text-[#102A4B]">{section}</h2>
        <p className="mx-auto mt-3 max-w-md text-xs leading-7 text-[#6B798A]">
          لا يوفر ORB API الحالي مسار إعدادات لهذا القسم. أبقيناه كحالة واضحة بدلاً من زر لا ينفذ إجراءً حقيقياً.
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const { user, token, logout, isSuperAdmin } = useOrbAuth();
  const superAdmin = isSuperAdmin();
  const [activeView, setActiveView] = useState<NavigationKey>("dashboard");
  const [dashboardSummary, setDashboardSummary] = useState<ApiDashboardSummary | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<ApiUser[]>([]);
  const [admins, setAdmins] = useState<ApiUser[]>([]);
  const [teacherTotal, setTeacherTotal] = useState(0);
  const [studentTotal, setStudentTotal] = useState(0);
  const [issues, setIssues] = useState<ApiLesson[]>([]);
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [disputedLessons, setDisputedLessons] = useState<ApiDisputedLesson[]>([]);
  const [payouts, setPayouts] = useState<ApiPayout[]>([]);
  const [reactivationRequests, setReactivationRequests] = useState<ApiReactivationRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<ApiSupportTicket[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingTeacherDetails, setLoadingTeacherDetails] = useState<string | null>(null);
  const [sectionLoading, setSectionLoading] = useState<NavigationKey | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<NavigationKey, string>>>({});
  const [loadedViews, setLoadedViews] = useState<Partial<Record<NavigationKey, boolean>>>({});
  const [reviewingTeacher, setReviewingTeacher] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherReviewNote, setTeacherReviewNote] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<ApiDispute | null>(null);
  const [disputeDecision, setDisputeDecision] = useState<"refund" | "release" | "partial">("refund");
  const [refundAmount, setRefundAmount] = useState("");
  const [disputeNote, setDisputeNote] = useState("");
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [selectedDisputedLesson, setSelectedDisputedLesson] = useState<ApiDisputedLesson | null>(null);
  const [lessonFinalStatus, setLessonFinalStatus] = useState<"completed" | "incomplete">("completed");
  const [lessonAdminNote, setLessonAdminNote] = useState("");
  const [resolvingLesson, setResolvingLesson] = useState(false);
  const [selectedIssueLesson, setSelectedIssueLesson] = useState<ApiLesson | null>(null);
  const [issueFinalStatus, setIssueFinalStatus] = useState<"completed" | "incomplete">("completed");
  const [issueAdminNote, setIssueAdminNote] = useState("");
  const [resolvingIssueLesson, setResolvingIssueLesson] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState<string | null>(null);
  const [markingNotification, setMarkingNotification] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ApiUser | null>(null);
  const [nextStudentStatus, setNextStudentStatus] = useState<"active" | "inactive" | "banned">("active");
  const [updatingStudent, setUpdatingStudent] = useState(false);
  const [selectedTeacherAccount, setSelectedTeacherAccount] = useState<ApiUser | null>(null);
  const [nextTeacherStatus, setNextTeacherStatus] = useState<"active" | "inactive" | "banned">("active");
  const [updatingTeacherAccount, setUpdatingTeacherAccount] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<ApiPayout | null>(null);
  const [completingPayout, setCompletingPayout] = useState(false);
  const [selectedReactivation, setSelectedReactivation] = useState<ApiReactivationRequest | null>(null);
  const [reactivationDecision, setReactivationDecision] = useState<"approved" | "rejected">("approved");
  const [reactivationNote, setReactivationNote] = useState("");
  const [resolvingReactivation, setResolvingReactivation] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminPendingRemoval, setAdminPendingRemoval] = useState<ApiUser | null>(null);
  const [removingAdmin, setRemovingAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<ApiUser | null>(null);
  const [adminEdit, setAdminEdit] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationDraft, setNotificationDraft] = useState({ title: "", message: "", userEmail: "" });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationPendingDeletion, setNotificationPendingDeletion] = useState<ApiNotification | null>(null);
  const [deletingNotification, setDeletingNotification] = useState(false);
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [auditAction, setAuditAction] = useState("");
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditActorId, setAuditActorId] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const mapTeacher = useCallback((teacher: ApiUser, index: number): Teacher => {
    const name = fullName(teacher);
    const palette = ["bg-[#E9D8C6] text-[#70442E]", "bg-[#D8E5F6] text-[#1E5D9A]", "bg-[#DDF0E8] text-[#1C7152]", "bg-[#EEE1F8] text-[#714097]"];
    const subjects = teacher.teacherProfile?.subjects?.filter(Boolean).join(" · ") || "المجال غير محدد";
    const stages = teacher.teacherProfile?.academic_stages?.filter(Boolean).join(" · ");
    return {
      id: teacher._id,
      name,
      subject: stages ? `${subjects} · ${stages}` : subjects,
      city: teacher.teacherProfile?.education_system || teacher.email || "—",
      initials: initials(name),
      tone: palette[index % palette.length],
      submitted: teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) : "—",
      documents: teacher.teacherProfile?.certificate ? 1 : 0,
      status: (teacher.teacherProfile?.verificationStatus as Teacher["status"]) || "pending",
      accountStatus: teacher.status === "inactive" || teacher.status === "banned" ? teacher.status : "active",
      certificate: teacher.teacherProfile?.certificate,
      email: teacher.email,
    };
  }, []);

  const openTeacherReview = async (teacher: Teacher) => {
    if (!token) return;
    setLoadingTeacherDetails(teacher.id);
    try {
      const response = await orbApi<ApiUser>(`/admin/teachers/${teacher.id}`, { token });
      const detailedTeacher = response.data;
      setSelectedTeacher(detailedTeacher ? mapTeacher(detailedTeacher, 0) : teacher);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل تفاصيل المدرس.");
    } finally { setLoadingTeacherDetails(null); }
  };

  const loadDashboardData = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const summaryResponse = await orbApi<ApiDashboardSummary>("/admin/dashboard/summary", { token });
      const summary = summaryResponse.data;
      if (!summary) throw new Error("استجابة ملخص العمليات غير مكتملة.");
      setDashboardSummary(summary);
      setTeachers((summary.queues.pendingTeachers ?? []).map(mapTeacher));
      setTeacherTotal(summary.counts.teacherTotal);
      setStudentTotal(summary.counts.studentTotal);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "تعذر تحميل بيانات لوحة ORB.");
    } finally { setDataLoading(false); }
  }, [mapTeacher, token]);

  useEffect(() => { void loadDashboardData(); }, [loadDashboardData]);

  const loadViewData = useCallback(async (view: NavigationKey) => {
    if (!token) return;
    if (loadedViews[view]) return;
    const needsLoad = ["teachers", "students", "issues", "disputes", "disputedLessons", "payouts", "reactivation", "support", "notifications", "admins"].includes(view);
    if (!needsLoad) return;
    setDataLoading(true);
    setSectionLoading(view);
    setSectionErrors((current) => ({ ...current, [view]: undefined }));
    try {
      if (view === "teachers") {
        const response = await orbApi<ApiUser[]>("/admin/teachers/all", { token });
        setAllTeachers((response.data ?? []).map(mapTeacher));
      }
      if (view === "students") {
        const response = await orbApi<ApiUser[]>("/admin/students/all", { token });
        setStudents(response.data ?? []);
      }
      if (view === "issues") {
        const response = await orbApi<ApiLesson[]>("/admin/lessons/issues", { token });
        setIssues(response.data ?? []);
      }
      if (view === "disputes") {
        const response = await orbApi<ApiDispute[]>("/disputes", { token });
        setDisputes(response.data ?? []);
      }
      if (view === "disputedLessons") {
        const response = await orbApi<ApiDisputedLesson[]>("/completeLessons/disputedLessons?page=1&limit=50", { token });
        setDisputedLessons(response.data ?? []);
      }
      if (view === "payouts") {
        const response = await orbApi<ApiPayout[]>("/payouts", { token });
        setPayouts(response.data ?? []);
      }
      if (view === "reactivation") {
        const response = await orbApi<ApiReactivationRequest[]>("/admin/account-reactivation-requests?status=pending&page=1&limit=100", { token });
        setReactivationRequests(response.data ?? []);
      }
      if (view === "support") {
        const response = await orbApi<ApiSupportTicket[]>("/support", { token });
        setSupportTickets(response.data ?? []);
      }
      if (view === "notifications") {
        const response = await orbApi<ApiNotification[]>("/notifications/all", { token });
        setNotifications(response.data ?? []);
      }
      if (view === "admins") {
        const response = await orbApi<ApiUser[]>("/admin", { token });
        setAdmins(response.data ?? []);
      }
      setLoadedViews((current) => ({ ...current, [view]: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل بيانات هذا القسم.";
      setSectionErrors((current) => ({ ...current, [view]: message }));
      toast.error(message);
    } finally { setSectionLoading(null); setDataLoading(false); }
  }, [loadedViews, mapTeacher, token]);

  const loadAuditLogs = useCallback(async () => {
    if (!token || !superAdmin) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params = new URLSearchParams({ page: String(auditPage), limit: "20" });
      if (auditAction.trim()) params.set("action", auditAction.trim());
      if (auditEntityType.trim()) params.set("entityType", auditEntityType.trim());
      if (auditActorId.trim()) params.set("actorId", auditActorId.trim());
      const response = await orbApi<ApiAuditLog[]>(`/audit-logs?${params.toString()}`, { token });
      setAuditLogs(response.data ?? []);
      if (response.pagination) setAuditPagination(response.pagination);
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تحميل سجل التدقيق.";
      setAuditError(message);
      toast.error(message);
    } finally { setAuditLoading(false); }
  }, [auditAction, auditActorId, auditEntityType, auditPage, superAdmin, token]);

  useEffect(() => {
    if (activeView === "audit") void loadAuditLogs();
  }, [activeView, loadAuditLogs]);

  const pendingTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) =>
          teacher.status === "pending" &&
          `${teacher.name} ${teacher.subject} ${teacher.city}`.includes(query.trim())
      ),
    [query, teachers],
  );

  const reviewTeacher = async (id: string, status: "approved" | "rejected") => {
    const teacher = selectedTeacher?.id === id ? selectedTeacher : teachers.find((item) => item.id === id);
    if (!token || !teacher) return;
    setReviewingTeacher(id);
    try {
      await orbApi<ApiUser>(`/admin/teachers/${status === "approved" ? "verify" : "reject"}/${id}`, {
        token,
        method: "PUT",
        body: status === "rejected" ? { reason: teacherReviewNote.trim() } : undefined,
      });
      toast.success(status === "approved" ? `تم اعتماد ${teacher.name}` : `تم رفض طلب ${teacher.name}`);
      setSelectedTeacher(null);
      setTeacherReviewNote("");
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة المدرس."); }
    finally { setReviewingTeacher(null); }
  };

  const resolveDispute = async () => {
    if (!token || !selectedDispute) return;
    const resolution = buildDisputeResolution(disputeDecision, refundAmount, disputeNote);
    if (!resolution) {
      toast.error("أدخلي مبلغ الاسترداد الجزئي أولاً.");
      return;
    }
    setResolvingDispute(true);
    try {
      await orbApi<{ success: boolean }>("/disputes/resolve", { token, method: "POST", body: { disputeId: selectedDispute._id, ...resolution } });
      toast.success("تم تسجيل قرار حل النزاع وإرسال التحديث إلى الأطراف.");
      setSelectedDispute(null);
      setRefundAmount("");
      setDisputeNote("");
      setDisputes((current) => current.map((item) => item._id === selectedDispute._id ? { ...item, status: "resolved", resolution } : item));
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حل النزاع."); }
    finally { setResolvingDispute(false); }
  };

  const resolveDisputedLesson = async () => {
    if (!token || !selectedDisputedLesson) return;
    if (!lessonAdminNote.trim()) {
      toast.error("أدخلي ملاحظة واضحة قبل اعتماد قرار الحصة.");
      return;
    }
    setResolvingLesson(true);
    try {
      await orbApi<ApiDisputedLesson>(`/completeLessons/${selectedDisputedLesson._id}/adminResolve`, {
        token,
        method: "PUT",
        body: { finalStatus: lessonFinalStatus, adminNote: lessonAdminNote.trim() },
      });
      toast.success("تم حسم الحصة المتنازع عليها وتسجيل ملاحظة الأدمن.");
      setDisputedLessons((current) => current.map((lesson) => lesson._id === selectedDisputedLesson._id ? { ...lesson, finalCompletionStatus: lessonFinalStatus, adminNote: lessonAdminNote.trim() } : lesson));
      setSelectedDisputedLesson(null);
      setLessonAdminNote("");
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حسم الحصة المتنازع عليها."); }
    finally { setResolvingLesson(false); }
  };

  const openIssueReview = (lesson: ApiLesson) => {
    setSelectedIssueLesson(lesson);
    setIssueFinalStatus(lesson.finalCompletionStatus === "incomplete" ? "incomplete" : "completed");
    setIssueAdminNote("");
  };

  const resolveIssueLesson = async () => {
    if (!token || !selectedIssueLesson) return;
    if (!canAdminResolveLesson(selectedIssueLesson.reviewStatus)) {
      toast.error("هذه الحالة ليست في انتظار حسم إداري عبر مسار الإتمام.");
      return;
    }
    if (!issueAdminNote.trim()) {
      toast.error("أدخلي ملاحظة واضحة قبل اعتماد قرار الدرس.");
      return;
    }
    setResolvingIssueLesson(true);
    try {
      await orbApi<ApiLesson>(`/completeLessons/${selectedIssueLesson._id}/adminResolve`, {
        token,
        method: "PUT",
        body: { finalStatus: issueFinalStatus, adminNote: issueAdminNote.trim() },
      });
      const refreshedIssues = await orbApi<ApiLesson[]>("/admin/lessons/issues", { token });
      setIssues(refreshedIssues.data ?? []);
      toast.success("تم حسم الدرس وتحديث قائمة المراجعة من ORB.");
      setSelectedIssueLesson(null);
      setIssueAdminNote("");
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حسم الدرس محل المراجعة."); }
    finally { setResolvingIssueLesson(false); }
  };

  const updateSupportTicket = async (ticket: ApiSupportTicket, nextStatus: "open" | "closed") => {
    if (!token) return;
    setUpdatingTicket(ticket._id);
    try {
      await orbApi<ApiSupportTicket>(`/support/${ticket._id}/${nextStatus === "closed" ? "close" : "reopen"}`, { token, method: "PUT" });
      toast.success(nextStatus === "closed" ? "تم إغلاق تذكرة الدعم." : "تمت إعادة فتح تذكرة الدعم.");
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث تذكرة الدعم."); }
    finally { setUpdatingTicket(null); }
  };

  const markNotificationRead = async (notification: ApiNotification) => {
    if (!token || notification.read) return;
    setMarkingNotification(notification._id);
    try {
      await orbApi<ApiNotification>(`/notifications/read/${notification._id}`, { token, method: "PUT" });
      setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, read: true } : item));
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث الإشعار."); }
    finally { setMarkingNotification(null); }
  };

  const updateStudentStatus = async () => {
    if (!token || !selectedStudent) return;
    setUpdatingStudent(true);
    try {
      await orbApi<ApiUser>(`/admin/users/${selectedStudent._id}/status`, { token, method: "PATCH", body: { status: nextStudentStatus } });
      toast.success("تم تحديث حالة حساب الطالب.");
      setStudents((current) => current.map((student) => student._id === selectedStudent._id ? { ...student, status: nextStudentStatus } : student));
      setSelectedStudent(null);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة الطالب."); }
    finally { setUpdatingStudent(false); }
  };

  const updateTeacherAccountStatus = async () => {
    if (!token || !selectedTeacherAccount) return;
    setUpdatingTeacherAccount(true);
    try {
      await orbApi<ApiUser>(`/admin/users/${selectedTeacherAccount._id}/status`, { token, method: "PATCH", body: { status: nextTeacherStatus } });
      toast.success("تم تحديث حالة حساب المدرس.");
      setAllTeachers((current) => current.map((teacher) => teacher.id === selectedTeacherAccount._id ? { ...teacher, accountStatus: nextTeacherStatus } : teacher));
      setTeachers((current) => current.map((teacher) => teacher.id === selectedTeacherAccount._id ? { ...teacher, accountStatus: nextTeacherStatus } : teacher));
      setSelectedTeacherAccount(null);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة حساب المدرس."); }
    finally { setUpdatingTeacherAccount(false); }
  };

  const completePayout = async () => {
    if (!token || !selectedPayout) return;
    if (selectedPayout.status !== "pending" && selectedPayout.status !== "processing") {
      toast.error("لا يمكن تأكيد تحويل فاشل أو مكتمل من هذه الشاشة.");
      return;
    }
    setCompletingPayout(true);
    try {
      await orbApi<ApiPayout>(`/payouts/${selectedPayout._id}/complete`, { token, method: "PATCH" });
      toast.success("تم تأكيد التحويل وتحديث حالته.");
      setPayouts((current) => current.map((payout) => payout._id === selectedPayout._id ? { ...payout, status: "completed" } : payout));
      setSelectedPayout(null);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إتمام التحويل."); }
    finally { setCompletingPayout(false); }
  };

  const resolveReactivation = async () => {
    if (!token || !selectedReactivation) return;
    setResolvingReactivation(true);
    try {
      await orbApi<ApiReactivationRequest>(`/admin/account-reactivation-requests/${selectedReactivation._id}/resolve`, {
        token,
        method: "PATCH",
        body: { decision: reactivationDecision, adminNote: reactivationNote.trim() },
      });
      toast.success(reactivationDecision === "approved" ? "تمت إعادة تفعيل الحساب." : "تم رفض طلب إعادة التفعيل.");
      setReactivationRequests((current) => current.filter((request) => request._id !== selectedReactivation._id));
      setSelectedReactivation(null);
      setReactivationNote("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حسم طلب إعادة التفعيل."); }
    finally { setResolvingReactivation(false); }
  };

  const createAdmin = async () => {
    if (!token || !superAdmin) return;
    if (!newAdmin.firstName.trim() || !newAdmin.lastName.trim() || !newAdmin.email.trim()) {
      toast.error("أدخلي الاسم الأول واسم العائلة والبريد الإلكتروني.");
      return;
    }
    setCreatingAdmin(true);
    try {
      await orbApi<ApiUser>("/admin", { token, method: "POST", body: { ...newAdmin, firstName: newAdmin.firstName.trim(), lastName: newAdmin.lastName.trim(), email: newAdmin.email.trim() } });
      toast.success("تم إنشاء حساب الأدمن وإرسال بياناته بالبريد إن كانت خدمة البريد مهيأة.");
      setNewAdmin({ firstName: "", lastName: "", email: "", phone: "" });
      setAdminDialogOpen(false);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء حساب الأدمن."); }
    finally { setCreatingAdmin(false); }
  };

  const removeAdmin = async () => {
    if (!token || !superAdmin || !adminPendingRemoval) return;
    setRemovingAdmin(true);
    try {
      await orbApi<{ message: string }>(`/admin/${adminPendingRemoval._id}`, { token, method: "DELETE" });
      toast.success("تم حذف حساب الأدمن.");
      setAdminPendingRemoval(null);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حذف حساب الأدمن."); }
    finally { setRemovingAdmin(false); }
  };

  const saveAdminEdit = async () => {
    if (!token || !superAdmin || !editingAdmin) return;
    if (!adminEdit.firstName.trim() || !adminEdit.lastName.trim() || !adminEdit.email.trim()) {
      toast.error("أدخلي الاسم الأول واسم العائلة والبريد الإلكتروني.");
      return;
    }
    setSavingAdmin(true);
    try {
      await orbApi<ApiUser>(`/admin/${editingAdmin._id}`, { token, method: "PUT", body: { ...adminEdit, firstName: adminEdit.firstName.trim(), lastName: adminEdit.lastName.trim(), email: adminEdit.email.trim() } });
      toast.success("تم تحديث بيانات حساب الأدمن.");
      setEditingAdmin(null);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تحديث حساب الأدمن."); }
    finally { setSavingAdmin(false); }
  };

  const sendNotification = async () => {
    if (!token) return;
    if (!notificationDraft.title.trim() || !notificationDraft.message.trim() || !notificationDraft.userEmail.trim()) {
      toast.error("أدخلي العنوان والرسالة وبريد المستلم.");
      return;
    }
    setSendingNotification(true);
    try {
      await orbApi<ApiNotification>("/notifications", { token, method: "POST", body: { title: notificationDraft.title.trim(), message: notificationDraft.message.trim(), userEmail: notificationDraft.userEmail.trim() } });
      toast.success("تم إرسال الإشعار إلى المستخدم.");
      setNotificationDraft({ title: "", message: "", userEmail: "" });
      setNotificationDialogOpen(false);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إرسال الإشعار."); }
    finally { setSendingNotification(false); }
  };

  const deleteNotification = async () => {
    if (!token || !notificationPendingDeletion) return;
    setDeletingNotification(true);
    try {
      await orbApi<{ message: string }>(`/notifications/${notificationPendingDeletion._id}`, { token, method: "DELETE" });
      toast.success("تم حذف الإشعار.");
      setNotificationPendingDeletion(null);
      await loadDashboardData();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حذف الإشعار."); }
    finally { setDeletingNotification(false); }
  };

  const changeView = (view: NavigationKey) => {
    if (view === "audit" && !superAdmin) return;
    setActiveView(view);
    setMobileMenuOpen(false);
    void loadViewData(view);
  };

  const activeTitle = navigation.find((item) => item.id === activeView)?.label ?? "نظرة عامة";
  const adminName = fullName(user);
  const adminInitial = adminName.charAt(0);
  const navigationCount = (id: NavigationKey) => {
    if (id === "teachers") return dashboardSummary?.counts.pendingTeachers ?? teachers.length;
    if (id === "issues") return dashboardSummary?.counts.lessonIssues ?? issues.length;
    if (id === "disputedLessons") return disputedLessons.filter((lesson) => lesson.finalCompletionStatus !== "completed" && lesson.finalCompletionStatus !== "incomplete").length;
    if (id === "disputes") return dashboardSummary?.counts.openDisputes ?? disputes.filter((dispute) => dispute.status !== "resolved").length;
    if (id === "payouts") return dashboardSummary?.counts.pendingPayouts ?? payouts.filter((payout) => payout.status !== "completed").length;
    if (id === "reactivation") return dashboardSummary?.counts.pendingReactivationRequests ?? reactivationRequests.length;
    if (id === "support") return dashboardSummary?.counts.openSupportTickets ?? supportTickets.filter((ticket) => ticket.status !== "closed").length;
    if (id === "notifications") return notifications.filter((notification) => !notification.read).length;
    return 0;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F9FC] text-[#1E3858]">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[268px] flex-col border-l border-[#E2EAF3] bg-white px-4 py-6 lg:flex">
        <OrbLogo className="px-2" />
        <div className="mt-10 px-2">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[#92A0B1]">مركز التشغيل</p>
        </div>
        <nav aria-label="التنقل الرئيسي" className="mt-3 space-y-1">
          {navigation.filter((item) => item.id !== "audit" || superAdmin).map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => changeView(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#EAF2FF] text-[#1769D5] shadow-[inset_-3px_0_0_#1769D5]"
                    : "text-[#56677B] hover:bg-[#F5F8FC] hover:text-[#1769D5]"
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="flex-1">{item.label}</span>
                {navigationCount(item.id) > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${isActive ? "bg-white text-[#1769D5]" : "bg-[#F0F4F8] text-[#7A8999]"}`}>
                    {navigationCount(item.id)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 border-t border-[#EAF0F5] pt-5">
          <button type="button" onClick={() => changeView("settings")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-[#627286] transition hover:bg-[#F5F8FC] hover:text-[#1769D5]">
            <Settings2 size={19} strokeWidth={1.8} />
            <span>الإعدادات</span>
          </button>
          <button type="button" onClick={() => changeView("support")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold text-[#627286] transition hover:bg-[#F5F8FC] hover:text-[#1769D5]">
            <CircleHelp size={19} strokeWidth={1.8} />
            <span>المساعدة والدعم</span>
          </button>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#102A4B] px-3 py-3.5 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F4B942] font-display text-xs font-bold text-[#102A4B]">{adminInitial}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold">{adminName}</p>
            <p className="mt-0.5 text-[9px] text-white/60">{superAdmin ? "Super Admin" : "إدارة المنصة"}</p>
          </div>
          <button type="button" aria-label="تسجيل الخروج" onClick={() => void logout()} className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#102A4B]/30 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside onClick={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 flex w-[286px] flex-col bg-white px-4 py-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <OrbLogo />
              <button type="button" aria-label="إغلاق القائمة" onClick={() => setMobileMenuOpen(false)} className={iconButtonClass}><X size={19} /></button>
            </div>
            <nav aria-label="التنقل على الجوال" className="mt-9 space-y-1">
              {navigation.filter((item) => item.id !== "audit" || superAdmin).map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return <button key={item.id} type="button" onClick={() => changeView(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs font-semibold ${isActive ? "bg-[#EAF2FF] text-[#1769D5]" : "text-[#56677B]"}`}><Icon size={19} /><span>{item.label}</span></button>;
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:mr-[268px]">
        <header className="sticky top-0 z-30 border-b border-[#E7EDF4] bg-[#F6F9FC]/90 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <button type="button" aria-label="فتح القائمة" onClick={() => setMobileMenuOpen(true)} className={iconButtonClass}><Menu size={20} /></button>
              <OrbLogo showLabel={false} imageClassName="h-9 w-9" />
            </div>
            <div className="hidden lg:block">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-[#91A0B2]">{new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              <p className="mt-1 font-display text-sm font-bold text-[#425672]">{activeTitle}</p>
            </div>
            <div className="mr-auto flex items-center gap-2 sm:gap-3">
              <button type="button" aria-label="البحث في طلبات المدرسين" onClick={() => changeView("teachers")} className={`${iconButtonClass} hidden sm:grid`}><Search size={19} /></button>
              <button type="button" aria-label="الإشعارات" onClick={() => changeView("notifications")} className={`${iconButtonClass} relative`}><Bell size={19} />{notifications.some((notification) => !notification.read) && <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-[#F0AA1A] ring-2 ring-white" />}</button>
              <div className="hidden items-center gap-2 border-r border-[#DFE7F0] pr-3 sm:flex">
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-bold text-[#243B59]">{adminName}</p>
                  <p className="mt-1 text-[9px] text-[#7C8B9C]">إدارة ORB</p>
                </div>
                <button type="button" onClick={() => void logout()} aria-label="تسجيل الخروج" className="grid h-9 w-9 place-items-center rounded-xl bg-[#F4B942] text-[11px] font-bold text-[#102A4B] transition hover:bg-[#FFD16C]">{adminInitial}</button>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1560px] px-4 pb-28 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pb-10">
          {sectionLoading === activeView && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#D5E4F5] bg-[#F4F9FF] px-4 py-3 text-xs font-semibold text-[#1769D5]"><Clock3 size={16} className="animate-spin" />جارٍ تحميل بيانات {activeTitle} من ORB…</div>}
          {sectionErrors[activeView] && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5C8CE] bg-[#FFF6F7] px-4 py-3 text-xs text-[#9B2634]"><span>تعذر تحميل {activeTitle}: {sectionErrors[activeView]}</span><button type="button" onClick={() => { setLoadedViews((current) => ({ ...current, [activeView]: false })); void loadViewData(activeView); }} className="font-bold underline">إعادة المحاولة</button></div>}
          {activeView === "dashboard" ? (
            <section className="space-y-7">
              {dataError && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F5C8CE] bg-[#FFF6F7] px-4 py-3 text-xs text-[#9B2634]"><span>تعذر تحميل بيانات ORB: {dataError}</span><button type="button" onClick={() => void loadDashboardData()} className="font-bold underline">إعادة المحاولة</button></div>}
              <div className="orb-enter relative overflow-hidden rounded-[26px] bg-[#102A4B] p-6 text-white sm:p-8 lg:p-10">
                <div className="absolute inset-y-0 left-0 hidden w-[48%] lg:block">
                  <img src={orbImageUrl("orb-operations-hero.jpg", "/manus-storage/orb-operations-hero_08667843.jpg")} alt="نظام ORB التعليمي" className="h-full w-full object-cover opacity-90 mix-blend-screen" />
                  <div className="absolute inset-0 bg-gradient-to-l from-[#102A4B] via-[#102A4B]/45 to-transparent" />
                </div>
                <div className="relative max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold text-[#CFE3FF]">
                    <Sparkles size={14} className="text-[#F4B942]" />
                    ملخص تشغيل اليوم
                  </div>
                  <h1 className="font-display mt-5 text-balance text-[30px] font-bold leading-[1.35] tracking-[-0.025em] sm:text-[38px]">
                    صباح الخير، {adminName}.<br />بيانات تشغيل ORB بين يديك الآن.
                  </h1>
                  <p className="mt-4 max-w-xl text-xs leading-7 text-[#B7CAE2] sm:text-[13px]">
                    راجعي طلبات التحقق والدروس قيد المراجعة والتحويلات المسترجعة مباشرة من باك إند ORB.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button onClick={() => changeView("teachers")} className="bg-[#F4B942] px-5 text-xs font-bold text-[#102A4B] shadow-none hover:bg-[#FFD16C]">
                      راجعي طلبات الانضمام <ChevronLeft size={16} />
                    </Button>
                    <button type="button" onClick={() => changeView("issues")} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10 active:scale-[0.97]">
                      فتح الدروس المعلّقة
                    </button>
                  </div>
                </div>
                <div className="relative mt-8 grid grid-cols-3 divide-x divide-x-reverse divide-white/15 border-t border-white/12 pt-5 lg:mt-10 lg:max-w-xl">
                  {[
                    [String(dashboardSummary?.counts.pendingTeachers ?? teachers.length), "طلبات تحقق"],
                    [String(dashboardSummary?.counts.lessonIssues ?? issues.length), "دروس تحتاج مراجعة"],
                    [String(dashboardSummary?.counts.pendingPayouts ?? payouts.filter((payout) => payout.status !== "completed").length), "تحويلات معلّقة"],
                  ].map(([value, label]) => (
                    <div key={label} className="px-3 first:pr-0">
                      <p dir="ltr" className="font-display text-right text-2xl font-bold tracking-[-0.05em] text-white">{value}</p>
                      <p className="mt-1 text-[9px] text-[#B7CAE2] sm:text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <section className="orb-enter orb-enter-delay-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="إجمالي المدرسين" value={String(dashboardSummary?.counts.teacherTotal ?? teacherTotal)} support="من ملخص ORB الحالي" icon={GraduationCap} accent="blue" />
                <KpiCard label="إجمالي الطلاب" value={String(dashboardSummary?.counts.studentTotal ?? studentTotal)} support="من ملخص ORB الحالي" icon={Users} accent="teal" />
                <KpiCard label="دروس قيد المراجعة" value={String(dashboardSummary?.counts.lessonIssues ?? issues.length)} support="مشكلات أو نزاعات مسجلة" icon={BookOpenText} accent="gold" />
                <KpiCard label="تحويلات معلّقة" value={String(dashboardSummary?.counts.pendingPayouts ?? payouts.filter((payout) => payout.status !== "completed").length)} support="من ملخص ORB الحالي" icon={WalletCards} accent="blue" />
              </section>

              <section className="orb-enter orb-enter-delay-2 grid gap-6 xl:grid-cols-[minmax(0,1.56fr)_minmax(320px,0.85fr)]">
                <article className="overflow-hidden rounded-3xl border border-[#E5EBF2] bg-white soft-shadow">
                  <div className="flex flex-col gap-4 border-b border-[#E9EFF5] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#E8F1FF] text-[#1769D5]"><UserCheck size={17} /></span>
                        <h2 className="font-display text-lg font-bold text-[#102A4B]">طلبات تحقق المدرسين</h2>
                      </div>
                      <p className="mt-2 text-[11px] text-[#758498]">مراجعة الوثائق قبل تفعيل حساب المدرس على المنصة.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative w-full sm:w-[180px]">
                        <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A98A9]" />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="البحث في طلبات المدرسين" placeholder="ابحثي في الطلبات" className="h-10 w-full rounded-xl border border-[#E1E8F1] bg-[#FAFCFE] pr-9 pl-3 text-[11px] text-[#40526A] outline-none transition focus:border-[#1769D5] focus:ring-2 focus:ring-[#1769D5]/10" />
                      </div>
                      <Button variant="outline" onClick={() => changeView("teachers")} className="h-10 border-[#D9E5F5] bg-white px-3 text-[11px] text-[#1769D5] hover:bg-[#F1F6FF]">عرض الكل</Button>
                    </div>
                  </div>
                  <div className="hidden px-6 md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#EAF0F5] hover:bg-transparent">
                          <TableHead className="h-11 text-right text-[10px] text-[#8492A2]">المدرس</TableHead>
                          <TableHead className="text-right text-[10px] text-[#8492A2]">المجال</TableHead>
                          <TableHead className="text-right text-[10px] text-[#8492A2]">الوثائق</TableHead>
                          <TableHead className="text-right text-[10px] text-[#8492A2]">وصل في</TableHead>
                          <TableHead className="w-[165px] text-center text-[10px] text-[#8492A2]">المراجعة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTeachers.slice(0, 4).map((teacher) => (
                          <TableRow key={teacher.id} className="border-[#EDF2F7]">
                            <TableCell className="py-3.5 text-right">
                              <div className="flex items-center gap-3">
                                <MiniAvatar teacher={teacher} size="sm" />
                                <div><p className="text-[11px] font-bold text-[#233B59]">{teacher.name}</p><p className="mt-1 text-[9px] text-[#8290A1]">{teacher.city}</p></div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3.5 text-right text-[10px] font-medium text-[#55677D]">{teacher.subject}</TableCell>
                            <TableCell className="py-3.5 text-right"><StatusPill tone="blue"><FileCheck2 size={12} />{teacher.documents} ملفات</StatusPill></TableCell>
                            <TableCell className="py-3.5 text-right text-[10px] text-[#718195]">{teacher.submitted}</TableCell>
                            <TableCell className="py-3.5 text-center">
                              <button type="button" disabled={loadingTeacherDetails === teacher.id} onClick={() => void openTeacherReview(teacher)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] px-3 py-2 text-[10px] font-bold text-[#1769D5] transition hover:bg-[#EAF2FF] disabled:opacity-60"><FileCheck2 size={13} />{loadingTeacherDetails === teacher.id ? "جارٍ التحميل…" : "مراجعة الشهادة"}</button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3 p-4 md:hidden">
                    {pendingTeachers.slice(0, 3).map((teacher) => (
                      <div key={teacher.id} className="rounded-2xl border border-[#E7EDF4] p-3.5">
                        <div className="flex items-start justify-between gap-2"><MiniAvatar teacher={teacher} /><StatusPill tone="blue">{teacher.documents} ملفات</StatusPill></div>
                        <p className="mt-3 text-xs font-bold text-[#233B59]">{teacher.name}</p><p className="mt-1 text-[10px] text-[#728196]">{teacher.subject} · {teacher.city}</p>
                        <button type="button" disabled={loadingTeacherDetails === teacher.id} onClick={() => void openTeacherReview(teacher)} className="mt-3 w-full rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] py-2 text-[10px] font-bold text-[#1769D5] disabled:opacity-60">{loadingTeacherDetails === teacher.id ? "جارٍ التحميل…" : "مراجعة الشهادة والقرار"}</button>
                      </div>
                    ))}
                  </div>
                  {dataLoading ? <div className="p-8 text-center text-xs text-[#718195]">جارٍ تحميل طلبات التحقق من ORB…</div> : pendingTeachers.length === 0 && <div className="p-8 text-center text-xs text-[#718195]">لا توجد طلبات تحقق مطابقة للبحث.</div>}
                </article>

                <aside className="space-y-6">
                  <article className="relative overflow-hidden rounded-3xl border border-[#E5EBF2] bg-white p-5 soft-shadow">
                    <img src={orbImageUrl("orb-approval-illustration.jpg", "/manus-storage/orb-approval-illustration_0fbc4396.jpg")} alt="مراجعة طلب انضمام مدرس" className="absolute inset-y-0 left-0 w-[47%] object-cover opacity-20" />
                    <div className="relative">
                      <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF4D7] text-[#B87900]"><Clock3 size={18} /></span><StatusPill tone="gold">أولوية اليوم</StatusPill></div>
                      <h3 className="font-display mt-5 max-w-[230px] text-xl font-bold leading-8 text-[#102A4B]">{dashboardSummary?.counts.pendingTeachers ?? teachers.length} طلب تحقق ينتظر المراجعة</h3>
                      <p className="mt-2 max-w-[240px] text-[11px] leading-6 text-[#6D7C8F]">هذا الرقم مسترجع مباشرة من الطلبات المعلّقة في ORB.</p>
                      <button type="button" onClick={() => changeView("teachers")} className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold text-[#1769D5] transition hover:gap-3">افتحي قائمة المدرسين <ArrowUpLeft size={15} /></button>
                    </div>
                  </article>

                  <article className="overflow-hidden rounded-3xl border border-[#E5EBF2] bg-white soft-shadow">
                    <div className="flex items-center justify-between px-5 pb-3 pt-5"><h3 className="font-display text-base font-bold text-[#102A4B]">حالات تحتاج متابعة</h3><button type="button" onClick={() => changeView("issues")} className="text-[10px] font-bold text-[#1769D5]">عرض الكل</button></div>
                    <div className="divide-y divide-[#EDF2F7]">
                      {issues.slice(0, 3).map((issue) => <button key={issue._id} type="button" onClick={() => openIssueReview(issue)} className="flex w-full items-center gap-3 px-5 py-4 text-right transition hover:bg-[#FAFCFE]"><div className={`grid h-9 w-9 place-items-center rounded-xl ${issue.disputeFlag ? "bg-[#FDEBEC] text-[#B12D3B]" : "bg-[#E8F1FF] text-[#1769D5]"}`}><TriangleAlert size={16} /></div><div className="flex-1"><p className="text-[11px] font-bold text-[#304763]">{issue.title || "درس بلا عنوان"}</p><p className="mt-1 text-[9px] text-[#8391A1]">{issue.reviewStatus || issue.finalCompletionStatus || issue.status || "قيد المراجعة"}</p></div><ChevronLeft size={15} className="text-[#9AA7B5]" /></button>)}
                      {!dataLoading && issues.length === 0 && <p className="px-5 py-6 text-center text-[11px] text-[#8391A1]">لا توجد حالات تحتاج متابعة.</p>}
                    </div>
                  </article>
                </aside>
              </section>

              <section className="orb-enter orb-enter-delay-3 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                <article className="rounded-3xl border border-[#E5EBF2] bg-white p-5 soft-shadow sm:p-6">
                  <div><p className="text-[10px] font-bold tracking-[0.13em] text-[#1769D5]">نبض المنصة</p><h3 className="font-display mt-2 text-lg font-bold text-[#102A4B]">لقطة تشغيلية حية</h3></div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#EAF2FF] p-4"><p className="text-[10px] text-[#59718D]">طلبات تحقق</p><p className="mt-2 text-2xl font-bold text-[#1769D5]">{dashboardSummary?.counts.pendingTeachers ?? teachers.length}</p></div><div className="rounded-2xl bg-[#FFF4D7] p-4"><p className="text-[10px] text-[#7B6A45]">دروس للمراجعة</p><p className="mt-2 text-2xl font-bold text-[#A76D00]">{dashboardSummary?.counts.lessonIssues ?? issues.length}</p></div><div className="rounded-2xl bg-[#E1F5EE] p-4"><p className="text-[10px] text-[#4B786A]">تحويلات معلّقة</p><p className="mt-2 text-2xl font-bold text-[#127054]">{dashboardSummary?.counts.pendingPayouts ?? payouts.filter((payout) => payout.status !== "completed").length}</p></div></div>
                  <p className="mt-5 text-[10px] leading-6 text-[#718095]">لا يقدم ORB API الحالي سلسلة زمنية يومية؛ لذلك تعرض هذه المساحة مؤشرات التشغيل الفعلية المتاحة الآن بدلاً من رسم تقديري.</p>
                </article>
                <article className="relative min-h-[245px] overflow-hidden rounded-3xl bg-[#EAF2FF] p-6">
                  <img src={orbImageUrl("orb-resources-illustration.jpg", "/manus-storage/orb-resources-illustration_552a2a10.jpg")} alt="موارد تعليمية" className="absolute inset-y-0 left-0 w-[48%] object-cover mix-blend-multiply opacity-85" />
                  <div className="relative max-w-[58%]"><StatusPill tone="blue">مصدر البيانات</StatusPill><h3 className="font-display mt-4 text-xl font-bold leading-8 text-[#102A4B]">اتصال Railway نشط</h3><p className="mt-2 text-[10px] leading-6 text-[#5D718C]">تظهر المؤشرات وقوائم المدرسين والطلاب والدروس والتحويلات من ORB API مباشرة.</p><button type="button" onClick={() => void loadDashboardData()} className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-[#1769D5]">تحديث البيانات <ChevronLeft size={14} /></button></div>
                </article>
              </section>
              <p className="text-center text-[10px] leading-6 text-[#93A0B0]">تعتمد هذه الشاشة على البيانات المتاحة من ORB API عبر Railway. تظهر البيانات وفق صلاحية حساب الأدمن المسجل.</p>
            </section>
          ) : activeView === "teachers" ? (
            <section className="space-y-6"><SectionTitle eyebrow="إدارة المدرسين" title="المدرسون" description="قائمة حية من المدرسين في ORB. لا يظهر قرار الاعتماد أو الرفض قبل فتح الشهادة ومراجعة بيانات المدرس." /><div className="rounded-3xl border border-[#E5EBF2] bg-white p-4 soft-shadow"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{allTeachers.map((teacher) => <div key={teacher.id} className="rounded-2xl border border-[#E8EEF5] p-4"><MiniAvatar teacher={teacher} /><p className="mt-3 text-xs font-bold text-[#263E5C]">{teacher.name}</p><p className="mt-1 text-[10px] text-[#748397]">{teacher.subject}</p><div className="mt-3 flex items-center justify-between gap-2"><StatusPill tone={teacher.accountStatus === "active" ? "teal" : teacher.accountStatus === "inactive" ? "gold" : "red"}>{teacher.accountStatus === "active" ? "الحساب نشط" : teacher.accountStatus === "inactive" ? "الحساب معطل" : "الحساب محظور"}</StatusPill><StatusPill tone={teacher.status === "approved" ? "teal" : teacher.status === "pending" ? "blue" : "red"}>{teacher.status === "approved" ? "معتمد" : teacher.status === "pending" ? "بانتظار الاعتماد" : "مرفوض"}</StatusPill></div><div className="mt-3 flex flex-wrap gap-2">{teacher.status === "pending" && <button type="button" onClick={() => setSelectedTeacher(teacher)} className="rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] px-2.5 py-2 text-[10px] font-bold text-[#1769D5]">مراجعة الشهادة</button>}<button type="button" onClick={() => { setSelectedTeacherAccount({ _id: teacher.id, firstName: teacher.name, email: teacher.email, status: teacher.accountStatus, role: "teacher" }); setNextTeacherStatus(teacher.accountStatus); }} className="rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] px-2.5 py-2 text-[10px] font-bold text-[#1769D5]">حالة الحساب</button></div></div>)}</div>{!dataLoading && allTeachers.length === 0 && <p className="p-8 text-center text-xs text-[#718195]">لا توجد بيانات مدرسين متاحة.</p>}</div></section>
          ) : activeView === "students" ? (
            <section className="space-y-6"><SectionTitle eyebrow="إدارة الطلاب" title="الطلاب" description="راجعي حالة الحساب قبل تفعيله أو تعطيله أو حظره من خلال نافذة تأكيد واضحة." /><div className="overflow-hidden rounded-3xl border border-[#E5EBF2] bg-white soft-shadow"><Table><TableHeader><TableRow className="border-[#EAF0F5]"><TableHead className="text-right">الطالب</TableHead><TableHead className="text-right">البريد الإلكتروني</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-center">الإدارة</TableHead></TableRow></TableHeader><TableBody>{students.map((student) => <TableRow key={student._id}><TableCell className="font-bold text-[#263E5C]">{fullName(student)}</TableCell><TableCell dir="ltr" className="text-right text-xs text-[#647386]">{student.email || "—"}</TableCell><TableCell><StatusPill tone={student.status === "banned" ? "red" : student.status === "inactive" ? "gold" : "teal"}>{student.status || "active"}</StatusPill></TableCell><TableCell className="text-center"><button type="button" onClick={() => { setSelectedStudent(student); setNextStudentStatus((student.status === "inactive" || student.status === "banned") ? student.status : "active"); }} className="rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] px-3 py-2 text-[10px] font-bold text-[#1769D5]">مراجعة الحالة</button></TableCell></TableRow>)}</TableBody></Table>{!dataLoading && students.length === 0 && <p className="p-8 text-center text-xs text-[#718195]">لا توجد بيانات طلاب متاحة.</p>}</div></section>
          ) : activeView === "issues" ? (
            <section className="space-y-6"><SectionTitle eyebrow="مراجعة الدروس" title="الدروس محل المراجعة" description="افتحي الدرس لمراجعة بياناته. الحصص ذات disputed أو under_admin_review يمكن حسمها مع ملاحظة موثّقة." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{issues.map((issue) => { const canResolve = canAdminResolveLesson(issue.reviewStatus); const resolved = isLessonAdminResolved(issue.reviewStatus, undefined); return <article key={issue._id} className="rounded-2xl border border-[#E5EBF2] bg-white p-5 soft-shadow"><StatusPill tone={resolved ? "teal" : issue.disputeFlag || issue.reviewStatus === "disputed" ? "red" : "gold"}>{resolved ? "تم الحسم" : issue.disputeFlag ? "نزاع" : issue.reviewStatus || issue.status || "مراجعة"}</StatusPill><h3 className="mt-4 text-sm font-bold text-[#263E5C]">{issue.title || "درس بلا عنوان"}</h3><p className="mt-2 text-xs text-[#718195]">{issue.subject || "المادة غير محددة"}</p><div className="mt-3 rounded-xl bg-[#F8FAFD] p-3 text-[10px] text-[#718195]"><p>حالة الإتمام: {issue.finalCompletionStatus || "—"}</p><p className="mt-1">الحالة الإدارية: {issue.reviewStatus || issue.status || "—"}</p></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-[10px] text-[#8190A0]">{canResolve ? "ينتظر قرار الأدمن" : resolved ? "تم تسجيل قرار سابق" : "راجعي التفاصيل"}</p><button type="button" onClick={() => openIssueReview(issue)} className="rounded-lg bg-[#102A4B] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#1769D5]">{canResolve ? "مراجعة وحسم" : "فتح التفاصيل"}</button></div></article>; })}</div>{!dataLoading && issues.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد دروس متاحة للمراجعة حالياً.</div>}</section>
          ) : activeView === "disputedLessons" ? (
            <section className="space-y-6"><SectionTitle eyebrow="مراجعة اكتمال الحصص" title="الحصص المتنازع عليها" description="حسم حالة الإتمام النهائية للحصة مع ملاحظة إدارية موثّقة قبل تحرير أو منع التسوية المرتبطة بها." /><div className="grid gap-4 lg:grid-cols-2">{disputedLessons.map((lesson) => { const studentName = typeof lesson.student === "string" ? "طالب ORB" : fullName(lesson.student); const teacherName = typeof lesson.acceptedTeacher === "string" ? "مدرس ORB" : fullName(lesson.acceptedTeacher); const resolved = isLessonAdminResolved(lesson.reviewStatus, lesson.adminNote); return <article key={lesson._id} className="rounded-3xl border border-[#E5EBF2] bg-white p-5 soft-shadow"><div className="flex items-start justify-between gap-3"><div><StatusPill tone={resolved ? "teal" : "red"}>{resolved ? "تم الحسم" : "يتطلب قراراً"}</StatusPill><h3 className="mt-3 text-sm font-bold text-[#263E5C]">{lesson.title || "حصة بلا عنوان"}</h3></div><span className="text-[10px] text-[#8A97A5]">{lesson.requestedDate ? new Date(lesson.requestedDate).toLocaleDateString("ar-EG") : "—"}</span></div><div className="mt-4 grid gap-2 rounded-xl bg-[#F8FAFD] p-3 text-[10px] text-[#64778D] sm:grid-cols-2"><p>الطالب: <strong className="text-[#354C68]">{studentName}</strong></p><p>المدرس: <strong className="text-[#354C68]">{teacherName}</strong></p><p>المادة: <strong className="text-[#354C68]">{lesson.subject || "—"}</strong></p><p>الدفع: <strong className="text-[#354C68]">{lesson.paymentStatus || "—"}</strong></p></div>{lesson.adminNote && <p className="mt-3 rounded-xl border border-[#D7E8DE] bg-[#F5FCF8] p-3 text-[10px] leading-6 text-[#237056]">ملاحظة الحسم: {lesson.adminNote}</p>}<div className="mt-4 flex items-center justify-between gap-3"><p className="text-[10px] text-[#8190A0]">الحالة: {lesson.finalCompletionStatus || lesson.reviewStatus || "قيد المراجعة"}</p>{!resolved && <button type="button" onClick={() => { setSelectedDisputedLesson(lesson); setLessonFinalStatus("completed"); setLessonAdminNote(""); }} className="rounded-lg bg-[#102A4B] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#1769D5]">مراجعة وحسم</button>}</div></article>; })}</div>{!dataLoading && disputedLessons.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد حصص متنازع عليها حالياً.</div>}</section>
          ) : activeView === "disputes" ? (
            <section className="space-y-6"><SectionTitle eyebrow="العدالة المالية" title="حل النزاعات" description="راجعي سبب النزاع والأدلة أولاً، ثم اختاري تحويل المبلغ للمدرس أو الاسترداد للطالب أو الاسترداد الجزئي." /><div className="grid gap-4 lg:grid-cols-2">{disputes.map((dispute) => { const lesson = typeof dispute.lessonId === "string" ? undefined : dispute.lessonId; const lessonTitle = lesson?.title || "درس مرتبط بالنزاع"; return <article key={dispute._id} className="rounded-3xl border border-[#E5EBF2] bg-white p-5 soft-shadow"><div className="flex items-start justify-between gap-3"><div><StatusPill tone={dispute.status === "resolved" ? "teal" : dispute.status === "under_review" ? "gold" : "red"}>{dispute.status === "resolved" ? "تم الحل" : dispute.status === "under_review" ? "قيد المراجعة" : "مفتوح"}</StatusPill><h3 className="mt-3 text-sm font-bold text-[#263E5C]">{lessonTitle}</h3></div><span className="text-[10px] text-[#8A97A5]">{dispute.createdAt ? new Date(dispute.createdAt).toLocaleDateString("ar-EG") : "—"}</span></div><div className="mt-4 rounded-xl bg-[#F8FAFD] p-3"><p className="text-[10px] font-bold text-[#53677F]">سبب النزاع: {dispute.reason || "other"}</p><p className="mt-2 text-[11px] leading-6 text-[#68788D]">{dispute.description || "لا يوجد وصف إضافي من مقدم النزاع."}</p></div>{dispute.evidence?.length ? <p className="mt-3 text-[10px] text-[#61758E]">{dispute.evidence.length} دليل مرفوع للمراجعة داخل نافذة الحل.</p> : null}<div className="mt-4 flex items-center justify-between gap-3">{dispute.resolution?.decision ? <p className="text-[10px] text-[#127054]">القرار: {dispute.resolution.decision}</p> : <p className="text-[10px] text-[#8A97A5]">بانتظار قرار الأدمن</p>}{dispute.status !== "resolved" && <button type="button" onClick={() => { setSelectedDispute(dispute); setDisputeDecision("refund"); setRefundAmount(""); setDisputeNote(""); }} className="rounded-lg bg-[#102A4B] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-[#1769D5]">مراجعة وحل النزاع</button>}</div></article>; })}</div>{!dataLoading && disputes.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد نزاعات مسجلة حالياً.</div>}</section>
          ) : activeView === "payouts" ? (
            <section className="space-y-6"><SectionTitle eyebrow="الإدارة المالية" title="التحويلات المالية" description="سجل التحويلات المتاح في ORB API. لا يتم تأكيد التحويل إلا بعد تنفيذه فعليًا ومراجعة بياناته." /><div className="overflow-hidden rounded-3xl border border-[#E5EBF2] bg-white soft-shadow"><Table><TableHeader><TableRow className="border-[#EAF0F5]"><TableHead className="text-right">المعرّف</TableHead><TableHead className="text-right">المبلغ</TableHead><TableHead className="text-right">الطريقة</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-center">الإجراء</TableHead></TableRow></TableHeader><TableBody>{payouts.map((payout) => <TableRow key={payout._id}><TableCell className="text-xs text-[#7D8B9C]">{payout._id}</TableCell><TableCell className="font-bold text-[#263E5C]">{payout.amount ?? 0}</TableCell><TableCell className="text-xs text-[#647386]">{payout.method || "—"}</TableCell><TableCell><StatusPill tone={payout.status === "completed" ? "teal" : payout.status === "failed" ? "red" : "gold"}>{payout.status || "pending"}</StatusPill></TableCell><TableCell className="text-center">{(payout.status === "pending" || payout.status === "processing") && <button type="button" onClick={() => setSelectedPayout(payout)} className="rounded-lg bg-[#102A4B] px-3 py-2 text-[10px] font-bold text-white">تأكيد الإتمام</button>}{payout.status === "failed" && <span className="text-[10px] text-[#B12D3B]">يحتاج إعادة تنفيذ</span>}</TableCell></TableRow>)}</TableBody></Table>{!dataLoading && payouts.length === 0 && <p className="p-8 text-center text-xs text-[#718195]">لا توجد تحويلات متاحة.</p>}</div></section>
          ) : activeView === "reactivation" ? (
            <section className="space-y-6"><SectionTitle eyebrow="إدارة الحسابات" title="طلبات إعادة تفعيل الحسابات" description="راجعي سبب الطلب وتحققي من بيانات المستخدم قبل إعادة الحساب إلى active. الموافقة تفتح الدخول فورًا، والرفض يترك الحساب على حالته الحالية." /><div className="grid gap-4 lg:grid-cols-2">{reactivationRequests.map((request) => { const requester = typeof request.user === "string" || !request.user ? null : request.user; return <article key={request._id} className="rounded-3xl border border-[#E5EBF2] bg-white p-5 soft-shadow"><div className="flex items-start justify-between gap-3"><div><StatusPill tone="gold">بانتظار المراجعة</StatusPill><h3 className="mt-3 text-sm font-bold text-[#263E5C]">{requester ? fullName(requester) : request.email || "مستخدم ORB"}</h3><p dir="ltr" className="mt-1 text-right text-[10px] text-[#718195]">{requester?.email || request.email || "—"}</p></div><StatusPill tone={request.requestedStatus === "banned" ? "red" : "gold"}>{request.requestedStatus === "banned" ? "محظور" : "غير نشط"}</StatusPill></div><div className="mt-4 rounded-2xl bg-[#F7FAFE] p-4"><p className="text-[10px] font-bold text-[#718195]">سبب المستخدم</p><p className="mt-2 text-xs leading-6 text-[#53677F]">{request.reason || "لم يذكر المستخدم سببًا."}</p></div><div className="mt-4 flex justify-end"><button type="button" onClick={() => { setSelectedReactivation(request); setReactivationDecision("approved"); setReactivationNote(""); }} className="rounded-lg bg-[#1769D5] px-3 py-2 text-[10px] font-bold text-white">مراجعة الطلب</button></div></article>; })}</div>{!dataLoading && reactivationRequests.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد طلبات إعادة تفعيل معلقة.</div>}</section>
          ) : activeView === "support" ? (
            <section className="space-y-6"><SectionTitle eyebrow="مساندة المستخدمين" title="طلبات الدعم" description="تتبّع مشكلات الطلاب والمدرسين ثم أغلقي التذكرة أو أعيدي فتحها وفق الحالة الفعلية." /><div className="grid gap-4 lg:grid-cols-2">{supportTickets.map((ticket) => { const requester = typeof ticket.user === "string" ? "مستخدم ORB" : fullName(ticket.user); return <article key={ticket._id} className="rounded-3xl border border-[#E5EBF2] bg-white p-5 soft-shadow"><div className="flex items-start justify-between gap-3"><div><StatusPill tone={ticket.status === "closed" ? "teal" : ticket.status === "in progress" ? "gold" : "blue"}>{ticket.status || "open"}</StatusPill><h3 className="mt-3 text-sm font-bold text-[#263E5C]">{ticket.problemType || "طلب دعم"}</h3></div><span className="text-[10px] text-[#8A97A5]">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString("ar-EG") : "—"}</span></div><p className="mt-3 text-[11px] font-bold text-[#53677F]">{requester}</p><p className="mt-2 text-[11px] leading-6 text-[#68788D]">{ticket.message || "لا توجد تفاصيل إضافية."}</p><div className="mt-4 flex justify-end">{ticket.status === "closed" ? <button type="button" disabled={updatingTicket === ticket._id} onClick={() => void updateSupportTicket(ticket, "open")} className="rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] px-3 py-2 text-[10px] font-bold text-[#1769D5] disabled:opacity-60">إعادة فتح</button> : <button type="button" disabled={updatingTicket === ticket._id} onClick={() => void updateSupportTicket(ticket, "closed")} className="rounded-lg bg-[#102A4B] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-60">إغلاق التذكرة</button>}</div></article>; })}</div>{!dataLoading && supportTickets.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد تذاكر دعم متاحة.</div>}</section>
          ) : activeView === "notifications" ? (
            <section className="space-y-6"><SectionTitle eyebrow="اتصالات المنصة" title="الإشعارات" description="إرسال رسائل للمستخدمين ومراجعة الرسائل الحالية، مع تعليمها كمقروء أو حذفها بعد التحقق." action={<Button type="button" onClick={() => setNotificationDialogOpen(true)} className="bg-[#1769D5] text-xs text-white hover:bg-[#0F56B4]"><Bell size={16} />إرسال إشعار</Button>} /><div className="space-y-3">{notifications.map((notification) => <article key={notification._id} className={`rounded-2xl border p-5 soft-shadow ${notification.read ? "border-[#E5EBF2] bg-white" : "border-[#BFD6F5] bg-[#F7FBFF]"}`}><div className="flex items-start justify-between gap-3"><div><StatusPill tone={notification.read ? "teal" : "blue"}>{notification.read ? "مقروء" : "جديد"}</StatusPill><h3 className="mt-3 text-sm font-bold text-[#263E5C]">{notification.title || "إشعار ORB"}</h3></div><span className="text-[10px] text-[#8A97A5]">{notification.createdAt ? new Date(notification.createdAt).toLocaleDateString("ar-EG") : "—"}</span></div><p className="mt-3 text-xs leading-6 text-[#68788D]">{notification.message || "لا توجد رسالة إضافية."}</p><div className="mt-4 flex gap-4">{!notification.read && <button type="button" disabled={markingNotification === notification._id} onClick={() => void markNotificationRead(notification)} className="text-[10px] font-bold text-[#1769D5] disabled:opacity-60">تعليم كمقروء</button>}<button type="button" onClick={() => setNotificationPendingDeletion(notification)} className="text-[10px] font-bold text-[#B12D3B]">حذف</button></div></article>)}</div>{!dataLoading && notifications.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد إشعارات متاحة.</div>}</section>
          ) : activeView === "admins" ? (
            <section className="space-y-6"><SectionTitle eyebrow="فريق الإدارة" title="حسابات الأدمن" description={superAdmin ? "إنشاء وتعديل وحذف حسابات الإدارة من خلال تأكيدات واضحة ومسارات ORB الفعلية." : "راجعي فريق الإدارة. تظل إدارة الحسابات الحساسة محصورة بحساب Super Admin."} action={superAdmin ? <Button type="button" onClick={() => setAdminDialogOpen(true)} className="bg-[#1769D5] text-xs text-white hover:bg-[#0F56B4]"><ShieldCheck size={16} />إضافة أدمن</Button> : undefined} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{admins.map((admin) => <article key={admin._id} className="rounded-2xl border border-[#E5EBF2] bg-white p-5 soft-shadow"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF4D7] font-bold text-[#8F5C00]">{initials(fullName(admin))}</div>{superAdmin && admin._id !== user?._id && <div className="flex gap-2"><button type="button" onClick={() => { setEditingAdmin(admin); setAdminEdit({ firstName: admin.firstName || "", lastName: admin.lastName || "", email: admin.email || "", phone: admin.phone || "" }); }} className="rounded-lg bg-[#EAF2FF] px-2.5 py-2 text-[10px] font-bold text-[#1769D5]">تعديل</button><button type="button" onClick={() => setAdminPendingRemoval(admin)} className="rounded-lg bg-[#FFF1F2] px-2.5 py-2 text-[10px] font-bold text-[#B12D3B]">حذف</button></div>}</div><h3 className="mt-4 text-sm font-bold text-[#263E5C]">{fullName(admin)}</h3><p dir="ltr" className="mt-2 text-right text-xs text-[#718195]">{admin.email || "—"}</p><p dir="ltr" className="mt-1 text-right text-[10px] text-[#8A97A5]">{admin.phone || "—"}</p><div className="mt-3"><StatusPill tone="blue">{admin.role === "superAdmin" ? "Super Admin" : "admin"}</StatusPill></div></article>)}</div>{!dataLoading && admins.length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D7E7] bg-white p-10 text-center text-xs text-[#718195]">لا توجد بيانات فريق إدارة متاحة.</div>}</section>
          ) : activeView === "audit" && superAdmin ? (
            <section className="space-y-6">
              <SectionTitle eyebrow="الحوكمة والامتثال" title="سجل التدقيق" description="سجل محمي للعمليات الإدارية الحساسة؛ يعرض الفاعل والعملية والكيان وتاريخ التنفيذ من ORB مباشرة." />
              <div className="rounded-3xl border border-[#E5EBF2] bg-white p-4 soft-shadow">
                <div className="grid gap-3 md:grid-cols-4">
                  <input value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setAuditPage(1); }} placeholder="تصفية باسم العملية" className="h-10 rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" />
                  <input value={auditEntityType} onChange={(event) => { setAuditEntityType(event.target.value); setAuditPage(1); }} placeholder="نوع الكيان، مثل User" className="h-10 rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" />
                  <input dir="ltr" value={auditActorId} onChange={(event) => { setAuditActorId(event.target.value); setAuditPage(1); }} placeholder="Actor ID" className="h-10 rounded-xl border border-[#DCE6F0] px-3 text-left text-xs outline-none focus:border-[#1769D5]" />
                  <Button type="button" disabled={auditLoading} onClick={() => void loadAuditLogs()} className="bg-[#1769D5] text-xs text-white hover:bg-[#0F56B4] disabled:opacity-60"><Search size={15} />{auditLoading ? "جارٍ التحديث…" : "تطبيق التصفية"}</Button>
                </div>
                {auditError && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F5C8CE] bg-[#FFF6F7] p-3 text-xs text-[#9B2634]"><span>{auditError}</span><button type="button" onClick={() => void loadAuditLogs()} className="font-bold underline">إعادة المحاولة</button></div>}
                <div className="mt-5 overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-[#EAF0F5]"><TableHead className="text-right">الوقت</TableHead><TableHead className="text-right">الفاعل</TableHead><TableHead className="text-right">العملية</TableHead><TableHead className="text-right">الكيان</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {auditLogs.map((entry) => {
                        const actor = typeof entry.actorId === "string" ? entry.actorId : fullName(entry.actorId);
                        return <TableRow key={entry._id}><TableCell className="text-xs text-[#6B7B90]">{entry.createdAt ? new Date(entry.createdAt).toLocaleString("ar-EG") : "—"}</TableCell><TableCell><p className="text-xs font-bold text-[#314966]">{actor}</p><p className="mt-1 text-[10px] text-[#8A98A9]">{entry.actorRole || "—"}</p></TableCell><TableCell className="font-mono text-[11px] text-[#1769D5]">{entry.action}</TableCell><TableCell><p className="text-xs text-[#475F7A]">{entry.entityType}</p><p dir="ltr" className="mt-1 max-w-[160px] truncate text-right text-[10px] text-[#8A98A9]">{entry.entityId || "—"}</p></TableCell></TableRow>;
                      })}
                    </TableBody>
                  </Table>
                  {auditLoading ? <p className="py-8 text-center text-xs text-[#1769D5]">جارٍ تحميل سجل التدقيق…</p> : !auditError && auditLogs.length === 0 && <p className="py-8 text-center text-xs text-[#718195]">لا توجد سجلات تطابق التصفية الحالية.</p>}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#EAF0F5] pt-4"><p className="text-[10px] text-[#7C8A9B]">إجمالي السجلات: {auditPagination.total}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={auditLoading || auditPagination.page <= 1} onClick={() => setAuditPage((current) => Math.max(1, current - 1))} className="text-xs">السابق</Button><span className="grid min-w-16 place-items-center text-[10px] text-[#62748A]">{auditPagination.page} / {auditPagination.totalPages}</span><Button variant="outline" size="sm" disabled={auditLoading || auditPagination.page >= auditPagination.totalPages} onClick={() => setAuditPage((current) => current + 1)} className="text-xs">التالي</Button></div></div>
              </div>
            </section>
          ) : <EmptySection section={activeTitle} />}
        </div>
      </main>

      <nav aria-label="التنقل السفلي" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#E3EAF3] bg-white/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {[navigation[0], navigation[1], navigation[2], navigation[3], navigation[4]].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return <button key={item.id} type="button" onClick={() => changeView(item.id)} className={`relative grid place-items-center gap-1 rounded-xl py-1.5 text-[9px] font-bold ${isActive ? "text-[#1769D5]" : "text-[#7B899A]"}`}><Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />{item.label === "الدروس محل المراجعة" ? "المراجعة" : item.label}</button>;
        })}
      </nav>

      <Dialog open={Boolean(selectedTeacher)} onOpenChange={(open) => { if (!open) { setSelectedTeacher(null); setTeacherReviewNote(""); } }}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#D9E5F2] bg-white p-0 text-right">
          <DialogHeader className="border-b border-[#E7EDF4] p-6 text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">مراجعة شهادة المدرس</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">راجعي المستند المرفوع وبيانات الطلب قبل اتخاذ أي قرار نهائي.</DialogDescription></DialogHeader>
          {selectedTeacher && <div className="space-y-5 p-6"><div className="flex items-center gap-3"><MiniAvatar teacher={selectedTeacher} /><div><p className="text-sm font-bold text-[#263E5C]">{selectedTeacher.name}</p><p className="mt-1 text-[11px] text-[#6C7D91]">{selectedTeacher.subject}</p><p dir="ltr" className="mt-1 text-right text-[10px] text-[#8391A1]">{selectedTeacher.email || "—"}</p></div></div>{selectedTeacher.certificate ? <section className="overflow-hidden rounded-2xl border border-[#D8E4F1]"><div className="flex items-center justify-between border-b border-[#E5EDF5] bg-[#F7FAFE] px-4 py-3"><span className="text-[11px] font-bold text-[#3B5470]">الشهادة المرفوعة</span><a href={selectedTeacher.certificate} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#1769D5]"><ExternalLink size={13} />فتح في تبويب جديد</a></div><iframe title={`شهادة ${selectedTeacher.name}`} src={selectedTeacher.certificate} sandbox="" className="h-[340px] w-full bg-[#F5F8FC]" /></section> : <section className="rounded-2xl border border-dashed border-[#E6B5BB] bg-[#FFF7F8] p-4 text-[11px] leading-6 text-[#A13441]">لا يوجد رابط شهادة مرفوع لهذا الطلب؛ لا يمكن اعتماد المدرس قبل إرفاق المستند، لكن يمكنك رفض الطلب بعد كتابة السبب.</section>}<label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">سبب الرفض — مطلوب فقط عند الرفض</span><textarea value={teacherReviewNote} onChange={(event) => setTeacherReviewNote(event.target.value)} rows={3} placeholder="اكتبي ملاحظة واضحة للمدرس إن تم الرفض" className="w-full resize-none rounded-xl border border-[#DCE6F0] bg-[#FBFDFF] p-3 text-xs outline-none transition focus:border-[#1769D5]" /></label></div>}
          <DialogFooter className="border-t border-[#E7EDF4] p-5 sm:justify-start"><Button type="button" variant="outline" onClick={() => { setSelectedTeacher(null); setTeacherReviewNote(""); }} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={!selectedTeacher || reviewingTeacher === selectedTeacher.id || !canFinalizeTeacherReview(selectedTeacher.certificate, "rejected", teacherReviewNote)} onClick={() => selectedTeacher && void reviewTeacher(selectedTeacher.id, "rejected")} className="bg-[#B12D3B] text-white hover:bg-[#94212D]">رفض الطلب</Button><Button type="button" disabled={!selectedTeacher || reviewingTeacher === selectedTeacher.id || !canFinalizeTeacherReview(selectedTeacher.certificate, "approved", teacherReviewNote)} onClick={() => selectedTeacher && void reviewTeacher(selectedTeacher.id, "approved")} className="bg-[#147255] text-white hover:bg-[#0F5D44]"><Check size={16} />اعتماد المدرس</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedDispute)} onOpenChange={(open) => { if (!open) { setSelectedDispute(null); setRefundAmount(""); setDisputeNote(""); } }}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-2xl overflow-y-auto border-[#D9E5F2] bg-white p-0 text-right">
          <DialogHeader className="border-b border-[#E7EDF4] p-6 text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">مراجعة وحل النزاع</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">القرار النهائي يغيّر حالة السجلات المالية ويرسل إشعاراً للطرفين؛ راجعي الأدلة قبل التأكيد.</DialogDescription></DialogHeader>
          {selectedDispute && <div className="space-y-5 p-6"><div className="rounded-2xl bg-[#F7FAFE] p-4"><p className="text-[11px] font-bold text-[#3B5470]">{typeof selectedDispute.lessonId === "string" ? "درس مرتبط بالنزاع" : selectedDispute.lessonId?.title || "درس مرتبط بالنزاع"}</p><p className="mt-2 text-[11px] leading-6 text-[#66798F]">السبب: {selectedDispute.reason || "other"} · {selectedDispute.description || "لا يوجد وصف إضافي"}</p></div>{selectedDispute.evidence?.length ? <section><p className="mb-2 text-[11px] font-bold text-[#435873]">الأدلة المرفوعة</p><div className="flex flex-wrap gap-2">{selectedDispute.evidence.map((evidence, index) => evidence.url ? <a key={`${evidence.url}-${index}`} href={evidence.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE0F5] bg-[#F7FAFE] px-3 py-2 text-[10px] font-bold text-[#1769D5]"><ExternalLink size={13} />دليل {index + 1}</a> : null)}</div></section> : <p className="text-[11px] text-[#8A97A5]">لا توجد أدلة مرفوعة مع هذا النزاع.</p>}<fieldset><legend className="mb-3 text-[11px] font-bold text-[#435873]">قرار الإدمن</legend><div className="grid gap-2 sm:grid-cols-3">{[{ value: "refund", label: "استرداد للطالب" }, { value: "release", label: "تحويل للمدرس" }, { value: "partial", label: "استرداد جزئي" }].map((choice) => <label key={choice.value} className={`cursor-pointer rounded-xl border p-3 text-center text-[10px] font-bold ${disputeDecision === choice.value ? "border-[#1769D5] bg-[#EAF2FF] text-[#1769D5]" : "border-[#E1E8F1] text-[#647386]"}`}><input className="sr-only" type="radio" name="dispute-decision" value={choice.value} checked={disputeDecision === choice.value} onChange={() => setDisputeDecision(choice.value as "refund" | "release" | "partial")} />{choice.label}</label>)}</div></fieldset>{disputeDecision === "partial" && <label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">قيمة الاسترداد الجزئي</span><input dir="ltr" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} inputMode="decimal" placeholder="0.00" className="h-11 w-full rounded-xl border border-[#DCE6F0] bg-[#FBFDFF] px-3 text-left text-xs outline-none focus:border-[#1769D5]" /></label>}<label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">ملاحظة قرار النزاع</span><textarea value={disputeNote} onChange={(event) => setDisputeNote(event.target.value)} rows={3} placeholder="اشرحي سبب القرار للأطراف وسجل التدقيق" className="w-full resize-none rounded-xl border border-[#DCE6F0] bg-[#FBFDFF] p-3 text-xs outline-none transition focus:border-[#1769D5]" /></label></div>}
          <DialogFooter className="border-t border-[#E7EDF4] p-5 sm:justify-start"><Button type="button" variant="outline" onClick={() => { setSelectedDispute(null); setRefundAmount(""); setDisputeNote(""); }} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={resolvingDispute} onClick={() => void resolveDispute()} className="bg-[#102A4B] text-white hover:bg-[#1769D5]">{resolvingDispute ? "جارٍ تسجيل القرار…" : "تأكيد حل النزاع"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedDisputedLesson)} onOpenChange={(open) => { if (!open) { setSelectedDisputedLesson(null); setLessonAdminNote(""); } }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">حسم الحصة المتنازع عليها</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">هذا القرار يحدد حالة الإتمام النهائية للحصة وقد يؤثر في تحرير التسوية المالية. تحققي من الوقائع ثم سجّلي السبب.</DialogDescription></DialogHeader>{selectedDisputedLesson && <div className="space-y-4"><div className="rounded-xl bg-[#F7FAFE] p-4"><p className="text-sm font-bold text-[#263E5C]">{selectedDisputedLesson.title || "حصة بلا عنوان"}</p><p className="mt-2 text-[11px] text-[#718195]">الحالة الحالية: {selectedDisputedLesson.finalCompletionStatus || selectedDisputedLesson.reviewStatus || "قيد المراجعة"}</p></div><fieldset><legend className="mb-2 block text-[11px] font-bold text-[#435873]">الحالة النهائية</legend><div className="grid grid-cols-2 gap-2"><label className={`cursor-pointer rounded-xl border p-3 text-center text-[11px] font-bold ${lessonFinalStatus === "completed" ? "border-[#1769D5] bg-[#EAF2FF] text-[#1769D5]" : "border-[#DCE6F0] text-[#607286]"}`}><input className="sr-only" type="radio" name="lesson-status" checked={lessonFinalStatus === "completed"} onChange={() => setLessonFinalStatus("completed")} />مكتملة</label><label className={`cursor-pointer rounded-xl border p-3 text-center text-[11px] font-bold ${lessonFinalStatus === "incomplete" ? "border-[#B12D3B] bg-[#FFF2F3] text-[#B12D3B]" : "border-[#DCE6F0] text-[#607286]"}`}><input className="sr-only" type="radio" name="lesson-status" checked={lessonFinalStatus === "incomplete"} onChange={() => setLessonFinalStatus("incomplete")} />غير مكتملة</label></div></fieldset><label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">ملاحظة الأدمن — مطلوبة</span><textarea value={lessonAdminNote} onChange={(event) => setLessonAdminNote(event.target.value)} rows={4} placeholder="اكتبي ملخص مراجعة الأدلة وسبب قرار الحسم" className="w-full resize-none rounded-xl border border-[#DCE6F0] bg-[#FBFDFF] p-3 text-xs outline-none transition focus:border-[#1769D5]" /></label></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => { setSelectedDisputedLesson(null); setLessonAdminNote(""); }} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={resolvingLesson || !lessonAdminNote.trim()} onClick={() => void resolveDisputedLesson()} className="bg-[#102A4B] text-white hover:bg-[#1769D5]">{resolvingLesson ? "جارٍ تسجيل الحسم…" : "تأكيد الحسم"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedIssueLesson)} onOpenChange={(open) => { if (!open) { setSelectedIssueLesson(null); setIssueAdminNote(""); } }}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">مراجعة الدرس محل المتابعة</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">راجعي حالة الدرس قبل تسجيل قرار نهائي. يظهر الحسم فقط عندما يكون ORB في انتظار قرار الأدمن.</DialogDescription></DialogHeader>{selectedIssueLesson && <div className="space-y-4"><div className="rounded-xl bg-[#F7FAFE] p-4"><p className="text-sm font-bold text-[#263E5C]">{selectedIssueLesson.title || "درس بلا عنوان"}</p><div className="mt-3 grid gap-2 text-[10px] text-[#66798F] sm:grid-cols-2"><p>المادة: <strong className="text-[#354C68]">{selectedIssueLesson.subject || "—"}</strong></p><p>المدة: <strong className="text-[#354C68]">{selectedIssueLesson.durationInMinutes ? `${selectedIssueLesson.durationInMinutes} دقيقة` : "—"}</strong></p><p>الدفع: <strong className="text-[#354C68]">{selectedIssueLesson.paymentStatus || "—"}</strong></p><p>المراجعة: <strong className="text-[#354C68]">{selectedIssueLesson.reviewStatus || selectedIssueLesson.status || "—"}</strong></p></div></div>{canAdminResolveLesson(selectedIssueLesson.reviewStatus) ? <><fieldset><legend className="mb-2 block text-[11px] font-bold text-[#435873]">الحالة النهائية</legend><div className="grid grid-cols-2 gap-2"><label className={`cursor-pointer rounded-xl border p-3 text-center text-[11px] font-bold ${issueFinalStatus === "completed" ? "border-[#1769D5] bg-[#EAF2FF] text-[#1769D5]" : "border-[#DCE6F0] text-[#607286]"}`}><input className="sr-only" type="radio" name="issue-lesson-status" checked={issueFinalStatus === "completed"} onChange={() => setIssueFinalStatus("completed")} />مكتملة</label><label className={`cursor-pointer rounded-xl border p-3 text-center text-[11px] font-bold ${issueFinalStatus === "incomplete" ? "border-[#B12D3B] bg-[#FFF2F3] text-[#B12D3B]" : "border-[#DCE6F0] text-[#607286]"}`}><input className="sr-only" type="radio" name="issue-lesson-status" checked={issueFinalStatus === "incomplete"} onChange={() => setIssueFinalStatus("incomplete")} />غير مكتملة</label></div></fieldset><label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">ملاحظة الأدمن — مطلوبة</span><textarea value={issueAdminNote} onChange={(event) => setIssueAdminNote(event.target.value)} rows={4} placeholder="اكتبي ملخص مراجعة الحالة وسبب قرار الحسم" className="w-full resize-none rounded-xl border border-[#DCE6F0] bg-[#FBFDFF] p-3 text-xs outline-none transition focus:border-[#1769D5]" /></label></> : <div className="rounded-xl border border-[#F2DCA9] bg-[#FFFBF0] p-4 text-[11px] leading-6 text-[#8A6500]">هذه الحالة مصنفة للمراجعة، لكنها ليست في حالة disputed أو under_admin_review التي يقبلها مسار الحسم الآلي. راجعي بياناتها من هنا ثم تابعيها عبر التدفق التشغيلي المناسب، من دون تسجيل قرار مالي غير مدعوم.</div>}</div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => { setSelectedIssueLesson(null); setIssueAdminNote(""); }} className="border-[#D9E5F2] text-[#58708B]">إغلاق</Button>{selectedIssueLesson && canAdminResolveLesson(selectedIssueLesson.reviewStatus) && <Button type="button" disabled={resolvingIssueLesson || !issueAdminNote.trim()} onClick={() => void resolveIssueLesson()} className="bg-[#102A4B] text-white hover:bg-[#1769D5]">{resolvingIssueLesson ? "جارٍ تسجيل الحسم…" : "تأكيد الحسم"}</Button>}</DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => { if (!open) setSelectedStudent(null); }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">مراجعة حالة الطالب</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">اختاري الحالة المناسبة للحساب. الحظر أو التعطيل يمنع الوصول إلى المنصة حتى تغيّر الحالة مرة أخرى.</DialogDescription></DialogHeader>{selectedStudent && <div className="space-y-4"><div className="rounded-xl bg-[#F7FAFE] p-4"><p className="text-sm font-bold text-[#263E5C]">{fullName(selectedStudent)}</p><p dir="ltr" className="mt-1 text-right text-[11px] text-[#718195]">{selectedStudent.email || "—"}</p></div><label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">الحالة الجديدة</span><select value={nextStudentStatus} onChange={(event) => setNextStudentStatus(event.target.value as "active" | "inactive" | "banned")} className="h-11 w-full rounded-xl border border-[#DCE6F0] bg-white px-3 text-xs outline-none focus:border-[#1769D5]"><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="banned">محظور</option></select></label></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setSelectedStudent(null)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={updatingStudent} onClick={() => void updateStudentStatus()} className={nextStudentStatus === "banned" ? "bg-[#B12D3B] text-white hover:bg-[#94212D]" : "bg-[#1769D5] text-white hover:bg-[#0F56B4]"}>{updatingStudent ? "جارٍ التحديث…" : "تأكيد تحديث الحالة"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTeacherAccount)} onOpenChange={(open) => { if (!open) setSelectedTeacherAccount(null); }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">مراجعة حالة حساب المدرس</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">هذه الحالة تخص الدخول إلى الحساب، وهي منفصلة عن اعتماد شهادة المدرس. الحساب غير النشط أو المحظور لا يستطيع استخدام المنصة حتى إعادة تفعيله.</DialogDescription></DialogHeader>{selectedTeacherAccount && <div className="space-y-4"><div className="rounded-xl bg-[#F7FAFE] p-4"><p className="text-sm font-bold text-[#263E5C]">{fullName(selectedTeacherAccount)}</p><p dir="ltr" className="mt-1 text-right text-[11px] text-[#718195]">{selectedTeacherAccount.email || "—"}</p></div><label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">الحالة الجديدة</span><select value={nextTeacherStatus} onChange={(event) => setNextTeacherStatus(event.target.value as "active" | "inactive" | "banned")} className="h-11 w-full rounded-xl border border-[#DCE6F0] bg-white px-3 text-xs outline-none focus:border-[#1769D5]"><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="banned">محظور</option></select></label></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setSelectedTeacherAccount(null)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={updatingTeacherAccount} onClick={() => void updateTeacherAccountStatus()} className={nextTeacherStatus === "banned" ? "bg-[#B12D3B] text-white hover:bg-[#94212D]" : "bg-[#1769D5] text-white hover:bg-[#0F56B4]"}>{updatingTeacherAccount ? "جارٍ التحديث…" : "تأكيد تحديث الحالة"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPayout)} onOpenChange={(open) => { if (!open) setSelectedPayout(null); }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">تأكيد إتمام التحويل</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">سيتم تحويل حالة السجل إلى مكتمل وتأكيد قيود المحاسبة المرتبطة به. راجعي بيانات التحويل قبل التأكيد.</DialogDescription></DialogHeader>{selectedPayout && <div className="rounded-2xl border border-[#E1EAF3] bg-[#F7FAFE] p-4"><p className="text-[11px] text-[#708095]">معرّف التحويل</p><p dir="ltr" className="mt-1 break-all text-right text-xs font-bold text-[#263E5C]">{selectedPayout._id}</p><p className="mt-4 text-[11px] text-[#708095]">المبلغ والطريقة</p><p className="mt-1 text-sm font-bold text-[#263E5C]">{selectedPayout.amount ?? 0} · {selectedPayout.method || "—"}</p></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setSelectedPayout(null)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={completingPayout} onClick={() => void completePayout()} className="bg-[#147255] text-white hover:bg-[#0F5D44]">{completingPayout ? "جارٍ التأكيد…" : "تأكيد إتمام التحويل"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedReactivation)} onOpenChange={(open) => { if (!open) { setSelectedReactivation(null); setReactivationNote(""); } }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">حسم طلب إعادة تفعيل الحساب</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">الموافقة تغيّر حالة الحساب إلى active وتسمح له بتسجيل الدخول. الرفض يبقي الحالة الحالية كما هي.</DialogDescription></DialogHeader>{selectedReactivation && <div className="space-y-4"><div className="rounded-xl bg-[#F7FAFE] p-4"><p className="text-sm font-bold text-[#263E5C]">{typeof selectedReactivation.user === "string" || !selectedReactivation.user ? selectedReactivation.email : fullName(selectedReactivation.user)}</p><p className="mt-2 text-xs leading-6 text-[#53677F]">{selectedReactivation.reason || "لا يوجد سبب إضافي."}</p></div><fieldset><legend className="mb-2 block text-[11px] font-bold text-[#435873]">القرار</legend><div className="grid grid-cols-2 gap-2"><label className={`cursor-pointer rounded-xl border p-3 text-center text-[11px] font-bold ${reactivationDecision === "approved" ? "border-[#1769D5] bg-[#EAF2FF] text-[#1769D5]" : "border-[#DCE6F0] text-[#607286]"}`}><input className="sr-only" type="radio" name="reactivation-decision" checked={reactivationDecision === "approved"} onChange={() => setReactivationDecision("approved")} />إعادة التفعيل</label><label className={`cursor-pointer rounded-xl border p-3 text-center text-[11px] font-bold ${reactivationDecision === "rejected" ? "border-[#B12D3B] bg-[#FFF2F3] text-[#B12D3B]" : "border-[#DCE6F0] text-[#607286]"}`}><input className="sr-only" type="radio" name="reactivation-decision" checked={reactivationDecision === "rejected"} onChange={() => setReactivationDecision("rejected")} />رفض الطلب</label></div></fieldset><label className="block"><span className="mb-2 block text-[11px] font-bold text-[#435873]">ملاحظة الأدمن</span><textarea value={reactivationNote} onChange={(event) => setReactivationNote(event.target.value)} rows={3} placeholder="اكتبي سبب القرار أو أي تعليمات للمستخدم" className="w-full resize-none rounded-xl border border-[#DCE6F0] bg-[#FBFDFF] p-3 text-xs outline-none focus:border-[#1769D5]" /></label></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setSelectedReactivation(null)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={resolvingReactivation} onClick={() => void resolveReactivation()} className={reactivationDecision === "rejected" ? "bg-[#B12D3B] text-white hover:bg-[#94212D]" : "bg-[#1769D5] text-white hover:bg-[#0F56B4]"}>{resolvingReactivation ? "جارٍ حفظ القرار…" : "تأكيد القرار"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={superAdmin && adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">إضافة حساب أدمن</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">ينشئ ORB حساب أدمن جديداً بكلمة مرور مؤقتة، ويرسلها إلى البريد عند تفعيل خدمة الإرسال في الباك إند.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">الاسم الأول</span><input value={newAdmin.firstName} onChange={(event) => setNewAdmin((current) => ({ ...current, firstName: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" /></label><label><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">اسم العائلة</span><input value={newAdmin.lastName} onChange={(event) => setNewAdmin((current) => ({ ...current, lastName: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">البريد الإلكتروني</span><input dir="ltr" type="email" value={newAdmin.email} onChange={(event) => setNewAdmin((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-left text-xs outline-none focus:border-[#1769D5]" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">الهاتف — اختياري</span><input dir="ltr" value={newAdmin.phone} onChange={(event) => setNewAdmin((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-left text-xs outline-none focus:border-[#1769D5]" /></label></div><DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setAdminDialogOpen(false)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={creatingAdmin} onClick={() => void createAdmin()} className="bg-[#1769D5] text-white hover:bg-[#0F56B4]">{creatingAdmin ? "جارٍ الإنشاء…" : "إنشاء حساب الأدمن"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={superAdmin && Boolean(adminPendingRemoval)} onOpenChange={(open) => { if (!open) setAdminPendingRemoval(null); }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#F2C8CE] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#A22D3A]">حذف حساب أدمن</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">هذا الإجراء يحذف الحساب المستهدف نهائياً ولا يمكن التراجع عنه من لوحة ORB.</DialogDescription></DialogHeader>{adminPendingRemoval && <div className="rounded-xl bg-[#FFF4F5] p-4"><p className="text-sm font-bold text-[#75303A]">{fullName(adminPendingRemoval)}</p><p dir="ltr" className="mt-1 text-right text-[11px] text-[#8A5960]">{adminPendingRemoval.email || "—"}</p></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setAdminPendingRemoval(null)} className="border-[#E6C8CD] text-[#87616A]">إلغاء</Button><Button type="button" disabled={removingAdmin} onClick={() => void removeAdmin()} className="bg-[#B12D3B] text-white hover:bg-[#94212D]">{removingAdmin ? "جارٍ الحذف…" : "تأكيد حذف الحساب"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={superAdmin && Boolean(editingAdmin)} onOpenChange={(open) => { if (!open) setEditingAdmin(null); }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">تعديل بيانات الأدمن</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">يقتصر التعديل على البيانات الأساسية للحساب؛ لا يمكن تغيير الدور أو كلمة المرور من هذا المسار.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">الاسم الأول</span><input value={adminEdit.firstName} onChange={(event) => setAdminEdit((current) => ({ ...current, firstName: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" /></label><label><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">اسم العائلة</span><input value={adminEdit.lastName} onChange={(event) => setAdminEdit((current) => ({ ...current, lastName: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">البريد الإلكتروني</span><input dir="ltr" type="email" value={adminEdit.email} onChange={(event) => setAdminEdit((current) => ({ ...current, email: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-left text-xs outline-none focus:border-[#1769D5]" /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">الهاتف</span><input dir="ltr" value={adminEdit.phone} onChange={(event) => setAdminEdit((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-left text-xs outline-none focus:border-[#1769D5]" /></label></div><DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setEditingAdmin(null)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={savingAdmin} onClick={() => void saveAdminEdit()} className="bg-[#1769D5] text-white hover:bg-[#0F56B4]">{savingAdmin ? "جارٍ الحفظ…" : "حفظ التعديلات"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg border-[#D9E5F2] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#102A4B]">إرسال إشعار</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">يصل الإشعار إلى المستخدم الذي يطابق بريده الإلكتروني في ORB.</DialogDescription></DialogHeader><div className="space-y-3"><label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">بريد المستلم</span><input dir="ltr" type="email" value={notificationDraft.userEmail} onChange={(event) => setNotificationDraft((current) => ({ ...current, userEmail: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-left text-xs outline-none focus:border-[#1769D5]" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">العنوان</span><input value={notificationDraft.title} onChange={(event) => setNotificationDraft((current) => ({ ...current, title: event.target.value }))} className="h-10 w-full rounded-xl border border-[#DCE6F0] px-3 text-xs outline-none focus:border-[#1769D5]" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-bold text-[#435873]">الرسالة</span><textarea rows={4} value={notificationDraft.message} onChange={(event) => setNotificationDraft((current) => ({ ...current, message: event.target.value }))} className="w-full resize-none rounded-xl border border-[#DCE6F0] p-3 text-xs outline-none focus:border-[#1769D5]" /></label></div><DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setNotificationDialogOpen(false)} className="border-[#D9E5F2] text-[#58708B]">إلغاء</Button><Button type="button" disabled={sendingNotification} onClick={() => void sendNotification()} className="bg-[#1769D5] text-white hover:bg-[#0F56B4]">{sendingNotification ? "جارٍ الإرسال…" : "تأكيد إرسال الإشعار"}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(notificationPendingDeletion)} onOpenChange={(open) => { if (!open) setNotificationPendingDeletion(null); }}>
        <DialogContent dir="rtl" className="max-w-lg border-[#F2C8CE] bg-white text-right"><DialogHeader className="text-right"><DialogTitle className="font-display text-xl text-[#A22D3A]">حذف إشعار</DialogTitle><DialogDescription className="text-right text-xs leading-6 text-[#6C7D91]">حذف الإشعار يزيله من سجل المستخدم؛ راجعي عنوانه قبل التأكيد.</DialogDescription></DialogHeader>{notificationPendingDeletion && <div className="rounded-xl bg-[#FFF4F5] p-4"><p className="text-sm font-bold text-[#75303A]">{notificationPendingDeletion.title || "إشعار ORB"}</p><p className="mt-2 text-xs text-[#8A5960]">{notificationPendingDeletion.message || "—"}</p></div>}<DialogFooter className="sm:justify-start"><Button type="button" variant="outline" onClick={() => setNotificationPendingDeletion(null)} className="border-[#E6C8CD] text-[#87616A]">إلغاء</Button><Button type="button" disabled={deletingNotification} onClick={() => void deleteNotification()} className="bg-[#B12D3B] text-white hover:bg-[#94212D]">{deletingNotification ? "جارٍ الحذف…" : "تأكيد حذف الإشعار"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
