import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardFrame from '../components/dashboard/DashboardFrame';
import ErrorState from '../components/ui/ErrorState';
import Spinner from '../components/ui/Spinner';
import {
  getAdminStudents,
  getAdminTeachers,
  getAdminEvaluations,
  getClassrooms,
  upsertClassroom,
  getResults,
  getStudentEvaluations,
  importExcel,
  backfillEvaluationDetails,
  createTeacherAccount,
  createStudentAccount,
  updateTeacherAccount,
  updateStudentAccount,
  deleteTeacherAccount,
  deleteStudentAccount,
  clearApiCache,
} from '../services/api';

const ADMIN_MENU = [
  'Tong quan',
  'Quan ly nguoi dung',
  'Quan ly giang vien',
  'Quan ly sinh vien',
  'Quan ly lop hoc',
  'Quan ly danh gia',
  'Bao cao & Thong ke',
  'Cai dat he thong',
];

const SKILL_KEYS = [
  { key: 'communication', label: 'Giao tiep', color: '#2563eb' },
  { key: 'teamwork', label: 'Lam viec nhom', color: '#22c55e' },
  { key: 'criticalThinking', label: 'Tu duy phan bien', color: '#f59e0b' },
  { key: 'timeManagement', label: 'Quan ly thoi gian', color: '#8b5cf6' },
];

const LEVEL_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const DEFAULT_USER_FORM = {
  role: 'teacher',
  name: '',
  email: '',
  username: '',
  password: '',
  classCode: '',
  teacherId: '',
};

const average = (items) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item, 0) / items.length;
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const levelFromScore = (score) => {
  if (score >= 8) return 'Tot';
  if (score < 6.5) return 'Yeu';
  return 'Trung binh';
};

const downloadSpreadsheet = (filename, columns, rows) => {
  if (typeof window === 'undefined') return;

  const header = columns.join('\t');
  const body = rows.map((row) => row.map((cell) => `${cell}`).join('\t')).join('\n');
  const blob = new Blob([`${header}\n${body}`], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const normalizeResults = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const score = parseNumber(item.score ?? item.result ?? item.softSkillScore ?? item.totalScore, 0);
    return {
      id: item.id || item.studentId || `student-${index + 1}`,
      name: item.name || item.studentName || `Sinh vien ${index + 1}`,
      className: item.className || item.class || item.classroom || item.classCode || 'Chua phan lop',
      score,
      level: item.level || item.rank || levelFromScore(score),
      communication: parseNumber(item.communication ?? item.communicationScore, score),
      teamwork: parseNumber(item.teamwork ?? item.teamworkScore, score),
      criticalThinking: parseNumber(item.criticalThinking ?? item.criticalThinkingScore, score),
      timeManagement: parseNumber(item.timeManagement ?? item.timeManagementScore, score),
    };
  });
};

const AdminDashboard = ({ user, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState(0);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [results, setResults] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('All');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [modalState, setModalState] = useState({
    isOpen: false,
    kind: 'user',
    mode: 'create',
    role: 'teacher',
    targetId: null,
  });
  const [formState, setFormState] = useState(DEFAULT_USER_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [evaluationDetailState, setEvaluationDetailState] = useState({
    isOpen: false,
    loading: false,
    error: '',
    data: null,
  });
  const [backfillMessage, setBackfillMessage] = useState('');
  const [backfillError, setBackfillError] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);
  const studentImportInputRef = useRef(null);

  const fetchAdminData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError('');

    try {
      const [teachersResponse, studentsResponse, classroomsResponse, resultsResponse, evaluationResponse] = await Promise.all([
        getAdminTeachers(),
        getAdminStudents(),
        getClassrooms(),
        getResults(),
        getAdminEvaluations(),
      ]);

      setTeachers(Array.isArray(teachersResponse?.data) ? teachersResponse.data : []);
      setStudents(Array.isArray(studentsResponse?.data) ? studentsResponse.data : []);
      setClassrooms(Array.isArray(classroomsResponse?.data) ? classroomsResponse.data : []);
      setResults(normalizeResults(resultsResponse?.data));
      setEvaluations(Array.isArray(evaluationResponse?.data) ? evaluationResponse.data : []);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setError(apiMessage || 'Khong the tai du lieu dashboard admin.');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAdminData(true);
  }, [fetchAdminData]);

  const skillChartData = useMemo(() => {
    return SKILL_KEYS.map((skill) => ({
      name: skill.label,
      value: Number(
        average(results.map((item) => parseNumber(item[skill.key], item.score))).toFixed(2)
      ),
      color: skill.color,
    }));
  }, [results]);

  const users = useMemo(() => {
    const teacherUsers = teachers.map((item, index) => ({
      id: item.id || `teacher-${index + 1}`,
      name: item.name || item.teacherName || 'Giang vien',
      username: item.username || item.userName || `teacher${index + 1}`,
      email: item.email || item.mail || `teacher${index + 1}@softskills.edu.vn`,
      role: 'Giang vien',
      sourceType: 'teacher',
      status: item.status || 'Dang hoat dong',
      createdAt: item.createdAt || '12/02/2025',
    }));

    const studentUsers = students.map((item, index) => ({
      id: item.id || `student-${index + 1}`,
      name: item.name || item.studentName || 'Sinh vien',
      username: item.username || item.userName || `student${index + 1}`,
      email: item.email || item.mail || `student${index + 1}@softskills.edu.vn`,
      role: 'Sinh vien',
      sourceType: 'student',
      classCode: item.classCode || item.className || item.class || item.classroom || '',
      teacherId: item.teacherId || '',
      status: item.status || 'Dang hoat dong',
      createdAt: item.createdAt || '20/02/2025',
    }));

    return [...teacherUsers, ...studentUsers];
  }, [teachers, students]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((item) => {
      const matchRole = userRole === 'All' || item.role === userRole;
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.username.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query);
      return matchRole && matchQuery;
    });
  }, [users, userRole, userSearch]);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    return teachers
      .map((item, index) => ({
        id: item.id || `teacher-${index + 1}`,
        name: item.name || item.teacherName || 'Giang vien',
        email: item.email || item.mail || `teacher${index + 1}@softskills.edu.vn`,
        username: item.username || item.userName || `teacher${index + 1}`,
        department: item.department || item.faculty || 'Khoa CNTT',
        classes: item.classCount || item.classes || item.classrooms?.length || 0,
        status: item.status || 'Dang hoat dong',
      }))
      .filter((item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        String(item.department).toLowerCase().includes(query)
      );
  }, [teachers, teacherSearch]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return students
      .map((item, index) => ({
        id: item.id || item.studentId || `SV${String(index + 1).padStart(3, '0')}`,
        name: item.name || item.studentName || 'Sinh vien',
        username: item.username || item.userName || `student${index + 1}`,
        className: item.classCode || item.className || item.class || item.classroom || 'Chua phan lop',
        classCode: item.classCode || item.className || item.class || item.classroom || '',
        teacherId: item.teacherId || '',
        teacher: item.teacherName || item.teacher || 'Nguyen Van A',
        averageScore: parseNumber(item.score ?? item.result ?? 0, 0),
        level: item.level || levelFromScore(parseNumber(item.score ?? item.result ?? 0, 0)),
      }))
      .filter((item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        String(item.id).toLowerCase().includes(query) ||
        item.className.toLowerCase().includes(query)
      );
  }, [students, studentSearch]);

  const filteredClasses = useMemo(() => {
    const query = classSearch.trim().toLowerCase();
    return classrooms
      .map((item, index) => ({
        id: item.id || `class-${index + 1}`,
        code: item.code || item.classCode || item.name || `Lop ${index + 1}`,
        name: item.name || item.className || item.code || `Lop ${index + 1}`,
        teacher: item.teacherName || item.teacher || 'Chua phan cong',
        teacherId: item.teacherId || '',
        totalStudents: item.totalStudents || item.size || 0,
        semester: item.semester || 'Hoc ky 2',
        year: item.year || '2024-2025',
      }))
      .filter((item) =>
        !query ||
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
  }, [classrooms, classSearch]);

  const teacherOptions = useMemo(() => {
    return teachers.map((item, index) => ({
      id: item.id || item.teacherId || index + 1,
      name: item.name || item.teacherName || `Giang vien ${index + 1}`,
    }));
  }, [teachers]);

  const resolveRoleValue = (roleLabel) => (roleLabel === 'Giang vien' ? 'teacher' : 'student');

  const openModal = ({ kind, mode, role, data }) => {
    const fallbackRole = kind === 'student' ? 'student' : 'teacher';
    const normalizedRole = role || (data?.role ? resolveRoleValue(data.role) : fallbackRole);
    const isClassroom = kind === 'classroom';
    setModalState({
      isOpen: true,
      kind,
      mode,
      role: normalizedRole,
      targetId: data?.id || null,
    });
    setFormError('');
    setFormState({
      role: normalizedRole,
      name: data?.name || '',
      email: data?.email || '',
      username: data?.username || '',
      password: '',
      classCode: isClassroom ? data?.code || data?.classCode || '' : data?.classCode || '',
      teacherId: data?.teacherId ? String(data.teacherId) : '',
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      kind: 'user',
      mode: 'create',
      role: 'teacher',
      targetId: null,
    });
    setFormState(DEFAULT_USER_FORM);
    setFormError('');
  };

  const handleFormChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (roleKind) => {
    if (roleKind === 'classroom') {
      if (!formState.classCode.trim()) return 'Vui long nhap ma lop.';
      if (!formState.name.trim()) return 'Vui long nhap ten lop.';
      if (!formState.teacherId) return 'Vui long chon giang vien phu trach.';
      return '';
    }

    if (!formState.name.trim()) return 'Vui long nhap ho ten.';
    if (!formState.username.trim()) return 'Vui long nhap username.';

    if (roleKind === 'teacher') {
      if (!formState.email.trim()) return 'Vui long nhap email.';
    }

    if (roleKind === 'student') {
      if (!formState.classCode.trim()) return 'Vui long nhap ma lop.';
      if (!formState.teacherId) return 'Vui long chon giang vien phu trach.';
    }

    if (modalState.mode === 'create' && !formState.password.trim()) {
      return 'Vui long nhap mat khau.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const roleKind = modalState.kind === 'user' ? formState.role : modalState.kind;
    const validationError = validateForm(roleKind);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (roleKind === 'teacher') {
        const payload = {
          name: formState.name.trim(),
          email: formState.email.trim(),
          username: formState.username.trim(),
          password: formState.password.trim(),
        };

        if (modalState.mode === 'create') {
          await createTeacherAccount(payload);
        } else if (modalState.targetId) {
          await updateTeacherAccount(modalState.targetId, payload);
        }
      }

      if (roleKind === 'student') {
        const payload = {
          name: formState.name.trim(),
          username: formState.username.trim(),
          password: formState.password.trim(),
          classCode: formState.classCode.trim(),
          teacherId: Number(formState.teacherId),
        };

        if (modalState.mode === 'create') {
          await createStudentAccount(payload);
        } else if (modalState.targetId) {
          await updateStudentAccount(modalState.targetId, payload);
        }
      }

      if (roleKind === 'classroom') {
        const payload = {
          id: modalState.targetId,
          name: formState.name.trim(),
          code: formState.classCode.trim(),
          teacherId: Number(formState.teacherId),
        };

        await upsertClassroom(payload);
      }

      clearApiCache();
      await fetchAdminData(false);
      closeModal();
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setFormError(apiMessage || 'Khong the luu du lieu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleKind, targetId) => {
    if (!targetId) return;
    if (!window.confirm('Ban co chac muon xoa tai khoan nay?')) return;

    setSaving(true);
    setFormError('');

    try {
      if (roleKind === 'teacher') {
        await deleteTeacherAccount(targetId);
      } else {
        await deleteStudentAccount(targetId);
      }

      clearApiCache();
      await fetchAdminData(false);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setFormError(apiMessage || 'Khong the xoa du lieu.');
    } finally {
      setSaving(false);
    }
  };

  const closeEvaluationDetail = () => {
    setEvaluationDetailState({
      isOpen: false,
      loading: false,
      error: '',
      data: null,
    });
  };

  const handleViewEvaluationDetails = async (row) => {
    if (!row?.studentId) return;

    setEvaluationDetailState({
      isOpen: true,
      loading: true,
      error: '',
      data: null,
    });

    try {
      const response = await getStudentEvaluations(row.studentId);
      const items = Array.isArray(response?.data) ? response.data : [];
      const matching = items.find((item) => Number(item.weekNumber) === Number(row.weekNumber));
      const selected = matching || items[0] || null;

      setEvaluationDetailState({
        isOpen: true,
        loading: false,
        error: '',
        data: {
          row,
          evaluation: selected,
          totalWeeks: items.length,
        },
      });
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setEvaluationDetailState({
        isOpen: true,
        loading: false,
        error: apiMessage || 'Khong the tai chi tiet danh gia.',
        data: null,
      });
    }
  };

  const handleBackfillEvaluations = async () => {
    if (!window.confirm('Bo sung chi tiet se cap nhat du lieu danh gia hien co. Tiep tuc?')) return;

    setBackfillLoading(true);
    setBackfillMessage('');
    setBackfillError('');

    try {
      const response = await backfillEvaluationDetails({ overwrite: false });
      const data = response?.data || {};
      const updated = Number(data.updatedCount ?? data.UpdatedCount ?? 0);
      const skipped = Number(data.skippedCount ?? data.SkippedCount ?? 0);
      const created = Number(data.createdEvaluations ?? data.CreatedEvaluations ?? 0);
      setBackfillMessage(`Da bo sung ${updated} danh gia (tao moi ${created}), bo qua ${skipped}.`);
      await fetchAdminData(false);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setBackfillError(apiMessage || 'Khong the bo sung chi tiet danh gia.');
    } finally {
      setBackfillLoading(false);
    }
  };

  const evaluationRows = useMemo(() => {
    if (!evaluations.length) {
      return [];
    }

    const studentMap = new Map(
      students.map((item) => [String(item.id || item.studentId), item.name || item.studentName])
    );

    return evaluations.slice(0, 12).map((item, index) => {
      const studentId = item.studentId || item.studentID || item.StudentId;
      const studentName =
        item.studentName ||
        item.StudentName ||
        studentMap.get(String(studentId)) ||
        `Sinh vien ${studentId || index + 1}`;
      const weekNumber = item.weekNumber || item.WeekNumber || 0;
      const totalScore = parseNumber(item.totalScore ?? item.TotalScore ?? item.finalScore ?? item.score, 0);
      const levelLabel = item.rank || item.Rank || item.level || levelFromScore(totalScore);
      return {
        id: item.evaluationId || item.id || `eval-${index + 1}`,
        studentId,
        student: studentName,
        weekNumber,
        teacher: item.evaluatorName || item.teacherName || `GV ${item.evaluatorId || index + 1}`,
        week: item.weekLabel || `Tuan ${weekNumber || index + 1}`,
        score: totalScore.toFixed(2),
        level: levelLabel,
        date: item.evaluationDate ? new Date(item.evaluationDate).toLocaleDateString('vi-VN') : '20/04/2025',
      };
    });
  }, [evaluations, students]);

  const reportTrend = useMemo(() => {
    const base = [6.2, 6.6, 6.95, 7.2, 7.4, 7.65];
    return base.map((score, index) => ({
      label: `T${index + 1}/2025`,
      score,
      support: Math.max(5, 18 - index * 2),
    }));
  }, []);

  const levelChartData = useMemo(() => {
    const levels = ['Tot', 'Trung binh', 'Yeu'];
    return levels.map((level) => ({
      name: level,
      value: results.filter((item) => levelFromScore(parseNumber(item.score)) === level || item.level === level).length,
    }));
  }, [results]);

  const topClasses = useMemo(() => {
    const groups = results.reduce((acc, item) => {
      const className = item.className || 'Chua phan lop';
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(item);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([className, members]) => ({
        className,
        averageScore: average(members.map((member) => member.score)),
        totalStudents: members.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  }, [results]);

  const activityRows = useMemo(() => {
    return [
      `${teachers.length} giang vien dang hoat dong trong he thong`,
      `${students.length} sinh vien da duoc dong bo du lieu`,
      `${classrooms.length} lop hoc da cau hinh thanh cong`,
      `${results.length} ban ghi danh gia san sang de bao cao`,
    ];
  }, [teachers.length, students.length, classrooms.length, results.length]);

  const handleImport = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Vui long chon tep Excel truoc khi tai len.');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');
    try {
      const response = await importExcel(selectedFile);
      const importedCount = Number(response?.data?.importedCount ?? response?.data?.ImportedCount ?? 0);
      const skippedCount = Number(response?.data?.skippedCount ?? response?.data?.SkippedCount ?? 0);
      const errors = response?.data?.errors ?? response?.data?.Errors ?? [];

      if (importedCount > 0) {
        const warningText =
          skippedCount > 0
            ? ` Da bo qua ${skippedCount} dong.`
            : '';
        setMessage(`Nhap du lieu Excel thanh cong: ${importedCount} dong.${warningText}`);
      } else {
        const firstError =
          Array.isArray(errors) && errors.length ? ` Loi: ${errors[0]}` : ' Khong co dong hop le de luu.';
        setError(`Import khong luu du lieu.${firstError}`);
      }

      await fetchAdminData(false);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setError(apiMessage || 'Nhap du lieu that bai.');
    } finally {
      setUploading(false);
    }
  };

  const handleExportUsers = () => {
    downloadSpreadsheet(
      'danh-sach-nguoi-dung.xls',
      ['Username', 'Email', 'Role', 'Trang thai', 'Ngay tao'],
      filteredUsers.map((item) => [item.username, item.email, item.role, item.status, item.createdAt])
    );
  };

  const handleExportTeachers = () => {
    downloadSpreadsheet(
      'danh-sach-giang-vien.xls',
      ['Ho ten', 'Email', 'Bo mon', 'So lop', 'Trang thai'],
      filteredTeachers.map((item) => [item.name, item.email, item.department, item.classes, item.status])
    );
  };

  const handleExportStudents = () => {
    downloadSpreadsheet(
      'danh-sach-sinh-vien.xls',
      ['Ho ten', 'Ma SV', 'Lop', 'Giang vien', 'Diem TB', 'Xep loai'],
      filteredStudents.map((item) => [
        item.name,
        item.id,
        item.className,
        item.teacher,
        item.averageScore.toFixed(2),
        item.level,
      ])
    );
  };

  const handleStudentImportClick = () => {
    studentImportInputRef.current?.click();
  };

  const handleStudentImportChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('');
    setError('');
    try {
      const response = await importExcel(file);
      const importedCount = Number(response?.data?.importedCount ?? response?.data?.ImportedCount ?? 0);
      const skippedCount = Number(response?.data?.skippedCount ?? response?.data?.SkippedCount ?? 0);
      const errors = response?.data?.errors ?? response?.data?.Errors ?? [];

      if (importedCount > 0) {
        const warningText =
          skippedCount > 0
            ? ` Da bo qua ${skippedCount} dong.`
            : '';
        setMessage(`Nhap du lieu Excel thanh cong: ${importedCount} dong.${warningText}`);
      } else {
        const firstError =
          Array.isArray(errors) && errors.length ? ` Loi: ${errors[0]}` : ' Khong co dong hop le de luu.';
        setError(`Import khong luu du lieu.${firstError}`);
      }

      await fetchAdminData(false);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setError(apiMessage || 'Nhap du lieu that bai.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return <Spinner label="Dang tai dashboard admin..." />;
  }

  if (error && results.length === 0 && teachers.length === 0 && students.length === 0) {
    return <ErrorState message={error} />;
  }

  const renderOverview = () => (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tong so nguoi dung', value: teachers.length + students.length, color: 'bg-blue-500' },
          { label: 'Giang vien', value: teachers.length, color: 'bg-emerald-500' },
          { label: 'Sinh vien', value: students.length, color: 'bg-violet-500' },
          { label: 'Lop hoc', value: classrooms.length, color: 'bg-orange-500' },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]"
          >
            <div className={`h-2 w-14 rounded-full ${item.color}`} />
            <p className="mt-4 text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
            <p className="mt-1 text-xs text-emerald-600">So lieu cap nhat tu he thong</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Thong ke danh gia theo ky nang</h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillChartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {skillChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Phan bo xep loai</h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {levelChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={LEVEL_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {levelChartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: LEVEL_COLORS[index] }} />
                  {item.name}
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Hoat dong he thong</h3>
          <div className="mt-4 grid gap-3">
            {activityRows.map((item, index) => (
              <div key={item} className="flex items-start justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">vua cap nhat</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Top 5 lop co diem trung binh cao nhat</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lop</th>
                  <th className="px-4 py-3">Diem TB</th>
                  <th className="px-4 py-3">Sinh vien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {topClasses.map((item) => (
                  <tr key={item.className}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.className}</td>
                    <td className="px-4 py-3 text-slate-600">{item.averageScore.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.totalStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Cap nhat du lieu danh gia</h3>
            <p className="mt-1 text-sm text-slate-500">Nhap tep Excel de dong bo nhanh du lieu cho hoi dong bao ve.</p>
          </div>
          <form onSubmit={handleImport} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Dang xu ly...' : 'Nhap Excel'}
            </button>
          </form>
        </div>
        {message ? <p className="mt-4 text-sm font-semibold text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      </section>
    </>
  );

  const renderUserManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach nguoi dung</h3>
            <p className="mt-1 text-sm text-slate-500">Quan ly tai khoan, vai tro va trang thai hoat dong.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openModal({ kind: 'user', mode: 'create', role: 'teacher' })}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              Them user
            </button>
            <button
              type="button"
              onClick={handleExportUsers}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Xuat Excel
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Tim theo ten, email, username"
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
          <select
            value={userRole}
            onChange={(event) => setUserRole(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
          >
            <option value="All">Tat ca vai tro</option>
            <option value="Giang vien">Giang vien</option>
            <option value="Sinh vien">Sinh vien</option>
          </select>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3">Ngay tao</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.username}</td>
                  <td className="px-4 py-3 text-slate-600">{item.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.status}</td>
                  <td className="px-4 py-3 text-slate-600">{item.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openModal({
                            kind: 'user',
                            mode: 'edit',
                            role: resolveRoleValue(item.role),
                            data: item,
                          })
                        }
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        Chinh sua
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.sourceType, item.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {uploading ? <p className="mt-4 text-sm font-semibold text-slate-500">Dang xu ly file...</p> : null}
        {message ? <p className="mt-2 text-sm font-semibold text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      </article>
    </section>
  );

  const renderTeacherManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach giang vien</h3>
            <p className="mt-1 text-sm text-slate-500">Theo doi bo mon, lop phu trach va trang thai.</p>
          </div>
          <button
            type="button"
            onClick={() => openModal({ kind: 'teacher', mode: 'create' })}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            Them giang vien
          </button>
        </div>
        <div className="mt-5">
          <input
            value={teacherSearch}
            onChange={(event) => setTeacherSearch(event.target.value)}
            placeholder="Tim theo ten, email, bo mon"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ho ten</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Bo mon</th>
                <th className="px-4 py-3">So lop</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTeachers.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.email}</td>
                  <td className="px-4 py-3 text-slate-600">{item.department}</td>
                  <td className="px-4 py-3 text-slate-600">{item.classes}</td>
                  <td className="px-4 py-3 text-slate-600">{item.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openModal({ kind: 'teacher', mode: 'edit', data: item })}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        Cap nhat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('teacher', item.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderStudentManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach sinh vien</h3>
            <p className="mt-1 text-sm text-slate-500">Quan ly thong tin, diem trung binh va xep loai.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openModal({ kind: 'student', mode: 'create' })}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              Them sinh vien
            </button>
            <button
              type="button"
              onClick={handleExportStudents}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Export Excel
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Tim theo ten, ma sinh vien, lop"
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
          <button
            type="button"
            onClick={handleStudentImportClick}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
          >
            Import Excel
          </button>
          <input
            ref={studentImportInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleStudentImportChange}
            className="hidden"
          />
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ho ten</th>
                <th className="px-4 py-3">Ma SV</th>
                <th className="px-4 py-3">Lop</th>
                <th className="px-4 py-3">GV phu trach</th>
                <th className="px-4 py-3">Diem TB</th>
                <th className="px-4 py-3">Xep loai</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.id}</td>
                  <td className="px-4 py-3 text-slate-600">{item.className}</td>
                  <td className="px-4 py-3 text-slate-600">{item.teacher}</td>
                  <td className="px-4 py-3 text-slate-600">{item.averageScore.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      {item.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openModal({ kind: 'student', mode: 'edit', data: item })}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        Chinh sua
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('student', item.id)}
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderClassManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach lop hoc</h3>
            <p className="mt-1 text-sm text-slate-500">Quan ly lop, hoc ky va phan cong giang vien.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
              onClick={() => openModal({ kind: 'classroom', mode: 'create' })}
            >
              Them lop
            </button>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Phan cong giang vien
            </button>
          </div>
        </div>
        <div className="mt-5">
          <input
            value={classSearch}
            onChange={(event) => setClassSearch(event.target.value)}
            placeholder="Tim theo ma lop, ten lop"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ma lop</th>
                <th className="px-4 py-3">Ten lop</th>
                <th className="px-4 py-3">GV chu nhiem</th>
                <th className="px-4 py-3">So SV</th>
                <th className="px-4 py-3">Hoc ky</th>
                <th className="px-4 py-3">Nam hoc</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredClasses.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.code}</td>
                  <td className="px-4 py-3 text-slate-600">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.teacher}</td>
                  <td className="px-4 py-3 text-slate-600">{item.totalStudents}</td>
                  <td className="px-4 py-3 text-slate-600">{item.semester}</td>
                  <td className="px-4 py-3 text-slate-600">{item.year}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                        onClick={() => openModal({ kind: 'classroom', mode: 'edit', data: item })}
                      >
                        Cap nhat
                      </button>
                      <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderEvaluationManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach danh gia</h3>
            <p className="mt-1 text-sm text-slate-500">Theo doi tien do danh gia cua giang vien.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Loc theo tuan
            </button>
            <button
              type="button"
              onClick={handleBackfillEvaluations}
              disabled={backfillLoading}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {backfillLoading ? 'Dang bo sung...' : 'Bo sung chi tiet'}
            </button>
          </div>
        </div>
        {backfillMessage ? (
          <p className="mt-2 text-sm font-semibold text-emerald-600">{backfillMessage}</p>
        ) : null}
        {backfillError ? (
          <p className="mt-2 text-sm font-semibold text-red-600">{backfillError}</p>
        ) : null}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Sinh vien</th>
                <th className="px-4 py-3">Giang vien</th>
                <th className="px-4 py-3">Tuan</th>
                <th className="px-4 py-3">Diem tong</th>
                <th className="px-4 py-3">Xep loai</th>
                <th className="px-4 py-3">Ngay danh gia</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {evaluationRows.length ? (
                evaluationRows.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.student}</td>
                    <td className="px-4 py-3 text-slate-600">{item.teacher}</td>
                    <td className="px-4 py-3 text-slate-600">{item.week}</td>
                    <td className="px-4 py-3 text-slate-600">{item.score}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.date}</td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                        onClick={() => handleViewEvaluationDetails(item)}
                      >
                        Xem chi tiet
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chua co du lieu danh gia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderReports = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Bao cao & thong ke</h3>
            <p className="mt-1 text-sm text-slate-500">Phan tich xu huong va nhom sinh vien can ho tro som.</p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Export Excel
            </button>
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Export PDF</button>
          </div>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Xu huong diem trung binh</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportTrend} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#2563eb" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Ti le sinh vien can ho tro som</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportTrend} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 20]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="support" fill="#f97316" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </article>
    </section>
  );

  const renderSettings = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <h3 className="text-lg font-extrabold text-slate-900">Cau hinh he thong</h3>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Trong so danh gia</p>
            <div className="mt-4 grid gap-3">
              {SKILL_KEYS.map((skill) => (
                <label key={skill.key} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{skill.label}</span>
                  <input
                    defaultValue={(skill.key === 'teamwork' ? 0.3 : 0.25).toFixed(2)}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Cau hinh hoc ky</p>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" defaultValue="Hoc ky 2" />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" defaultValue="2024-2025" />
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Cap nhat
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Cau hinh phan quyen</p>
            <div className="mt-4 grid gap-3">
              {['Admin', 'Giang vien', 'Sinh vien'].map((role) => (
                <label key={role} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{role}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Doi mat khau admin</p>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Mat khau hien tai" />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Mat khau moi" />
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Cap nhat mat khau
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  );

  const mainContent = () => {
    switch (activeMenu) {
      case 0:
        return renderOverview();
      case 1:
        return renderUserManagement();
      case 2:
        return renderTeacherManagement();
      case 3:
        return renderStudentManagement();
      case 4:
        return renderClassManagement();
      case 5:
        return renderEvaluationManagement();
      case 6:
        return renderReports();
      case 7:
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  const modalRoleKind = modalState.kind === 'user' ? formState.role : modalState.kind;
  const isClassroomModal = modalState.kind === 'classroom';
  const modalTitle =
    modalState.mode === 'create'
      ? isClassroomModal
        ? 'Them lop'
        : modalRoleKind === 'teacher'
          ? 'Them giang vien'
          : 'Them sinh vien'
      : isClassroomModal
        ? 'Cap nhat lop'
        : modalRoleKind === 'teacher'
          ? 'Cap nhat giang vien'
          : 'Cap nhat sinh vien';
  const submitLabel = saving ? 'Dang luu...' : modalState.mode === 'create' ? 'Luu' : 'Cap nhat';

  return (
    <DashboardFrame
      role="admin"
      title={ADMIN_MENU[activeMenu] || 'Tong quan he thong'}
      subtitle="Chao mung ban tro lai, Admin."
      user={user}
      onLogout={onLogout}
      menuItems={ADMIN_MENU.map((label, index) => ({
        label,
        active: index === activeMenu,
        onClick: () => setActiveMenu(index),
      }))}
      headerControls={
        <>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
            01/06/2025 - 31/05/2026
          </div>
          <button
            type="button"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
          >
            Xuat bao cao
          </button>
        </>
      }
      rightNotes={[]}
    >
      {mainContent()}
      {modalState.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                  {isClassroomModal ? 'Quan ly lop hoc' : 'Quan ly tai khoan'}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">{modalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Dong
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              {modalState.kind === 'user' ? (
                <label className="text-sm font-semibold text-slate-600">
                  Vai tro
                  <select
                    value={formState.role}
                    onChange={handleFormChange('role')}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                  >
                    <option value="teacher">Giang vien</option>
                    <option value="student">Sinh vien</option>
                  </select>
                </label>
              ) : null}

              <label className="text-sm font-semibold text-slate-600">
                {isClassroomModal ? 'Ten lop' : 'Ho ten'}
                <input
                  value={formState.name}
                  onChange={handleFormChange('name')}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
                  placeholder={isClassroomModal ? 'Nhap ten lop' : 'Nhap ho ten'}
                />
              </label>

              {modalRoleKind === 'teacher' ? (
                <label className="text-sm font-semibold text-slate-600">
                  Email
                  <input
                    value={formState.email}
                    onChange={handleFormChange('email')}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
                    placeholder="teacher@school.edu"
                  />
                </label>
              ) : null}

              {!isClassroomModal ? (
                <label className="text-sm font-semibold text-slate-600">
                  Username
                  <input
                    value={formState.username}
                    onChange={handleFormChange('username')}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
                    placeholder="Nhap username"
                  />
                </label>
              ) : null}

              {!isClassroomModal ? (
                <label className="text-sm font-semibold text-slate-600">
                  Mat khau {modalState.mode === 'edit' ? '(bo qua neu khong doi)' : ''}
                  <input
                    type="password"
                    value={formState.password}
                    onChange={handleFormChange('password')}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
                    placeholder="Nhap mat khau"
                  />
                </label>
              ) : null}

              {modalRoleKind === 'student' ? (
                <>
                  <label className="text-sm font-semibold text-slate-600">
                    Ma lop
                    <input
                      value={formState.classCode}
                      onChange={handleFormChange('classCode')}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
                      placeholder="22CTT12"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Giang vien phu trach
                    <select
                      value={formState.teacherId}
                      onChange={handleFormChange('teacherId')}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                    >
                      <option value="">Chon giang vien</option>
                      {teacherOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              {isClassroomModal ? (
                <>
                  <label className="text-sm font-semibold text-slate-600">
                    Ma lop
                    <input
                      value={formState.classCode}
                      onChange={handleFormChange('classCode')}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
                      placeholder="22CTT12"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-600">
                    Giang vien chu nhiem
                    <select
                      value={formState.teacherId}
                      onChange={handleFormChange('teacherId')}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                    >
                      <option value="">Chon giang vien</option>
                      {teacherOptions.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              {formError ? <p className="text-sm font-semibold text-red-600">{formError}</p> : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {evaluationDetailState.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Chi tiet danh gia</p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  {evaluationDetailState.data?.row?.student || 'Sinh vien'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {evaluationDetailState.data?.row?.week || 'Tuan'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEvaluationDetail}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Dong
              </button>
            </div>

            <div className="mt-6">
              {evaluationDetailState.loading ? (
                <p className="text-sm font-semibold text-slate-500">Dang tai chi tiet...</p>
              ) : evaluationDetailState.error ? (
                <p className="text-sm font-semibold text-red-600">{evaluationDetailState.error}</p>
              ) : (
                (() => {
                  const evaluation = evaluationDetailState.data?.evaluation;
                  const detailItems = evaluation?.details || evaluation?.Details || [];
                  const summary = {
                    finalScore: parseNumber(evaluation?.finalScore ?? evaluation?.FinalScore ?? 0).toFixed(2),
                    level: evaluation?.level || evaluation?.Level || 'Chua danh gia',
                    date: evaluation?.evaluationDate
                      ? new Date(evaluation.evaluationDate).toLocaleDateString('vi-VN')
                      : 'Chua cap nhat',
                    totalWeeks: evaluationDetailState.data?.totalWeeks || 0,
                  };

                  return (
                    <div className="grid gap-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase text-slate-500">Diem tong</p>
                          <p className="mt-2 text-2xl font-extrabold text-slate-900">{summary.finalScore}</p>
                          <p className="mt-1 text-sm text-slate-500">Xep loai: {summary.level}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase text-slate-500">Ngay danh gia</p>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{summary.date}</p>
                          <p className="mt-1 text-sm text-slate-500">Tong {summary.totalWeeks} tuan</p>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          { label: 'Giao tiep', value: evaluation?.communication ?? evaluation?.Communication ?? 0 },
                          { label: 'Lam viec nhom', value: evaluation?.teamwork ?? evaluation?.Teamwork ?? 0 },
                          { label: 'Tu duy phan bien', value: evaluation?.criticalThinking ?? evaluation?.CriticalThinking ?? 0 },
                          { label: 'Quan ly thoi gian', value: evaluation?.timeManagement ?? evaluation?.TimeManagement ?? 0 },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-slate-100 p-4">
                            <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                            <p className="mt-2 text-lg font-bold text-slate-900">
                              {parseNumber(item.value, 0).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {detailItems.length ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                          <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Ky nang</th>
                                <th className="px-4 py-3">Diem</th>
                                <th className="px-4 py-3">Trong so</th>
                                <th className="px-4 py-3">Nhan xet</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {detailItems.map((detail, index) => (
                                <tr key={`${detail.skillType || detail.SkillType}-${index}`}
                                  >
                                  <td className="px-4 py-3 font-semibold text-slate-800">
                                    {detail.skillType || detail.SkillType}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {parseNumber(detail.score ?? detail.Score, 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {parseNumber(detail.weight ?? detail.Weight, 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {detail.comment || detail.Comment || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Chua co chi tiet diem ky nang.</p>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      ) : null}
    </DashboardFrame>
  );
};

export default AdminDashboard;
