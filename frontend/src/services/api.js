import axios from 'axios';

const DEFAULT_API_BASE_URL = '';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL,
  timeout: 10000,
});

const responseCache = new Map();
const pendingRequests = new Map();
const CLASSROOMS_KEY = 'ss_classrooms';
const EVALUATIONS_KEY = 'ss_evaluations';

const getFromCache = (key) => {
  const entry = responseCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expireAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }

  return entry.response;
};

const cachedGet = (key, requestFactory, ttlMs = 15000) => {
  const cachedResponse = getFromCache(key);
  if (cachedResponse) {
    return Promise.resolve(cachedResponse);
  }

  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }

  const request = requestFactory()
    .then((response) => {
      responseCache.set(key, {
        response,
        expireAt: Date.now() + ttlMs,
      });
      return response;
    })
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, request);
  return request;
};

const toArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.students)) return payload.students;
  return [];
};

const wrapResponseData = (response, data) => ({
  ...response,
  data,
});

const getFirstSuccessful = async (requests) => {
  let lastError = null;

  for (const requestConfig of requests) {
    const normalizedConfig =
      typeof requestConfig === 'string'
        ? { path: requestConfig, method: 'get' }
        : { method: 'get', ...requestConfig };

    try {
      return await api.request({
        method: normalizedConfig.method,
        url: normalizedConfig.path,
        data: normalizedConfig.data,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No endpoint available.');
};

const tryGetFirstSuccessful = async (paths) => {
  try {
    return await getFirstSuccessful(paths);
  } catch (_error) {
    return null;
  }
};

export const clearApiCache = () => {
  responseCache.clear();
  pendingRequests.clear();
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const login = (credentials) =>
  getFirstSuccessful([
    { path: '/api/Auth/login', method: 'post', data: credentials },
    { path: '/api/auth/login', method: 'post', data: credentials },
  ]);

export const getCurrentStudent = () => getFirstSuccessful(['/api/Student/me', '/api/student/me']);
export const getCurrentTeacher = () => getFirstSuccessful(['/api/Teacher/me', '/api/teacher/me']);

const readLocalJson = (key, fallbackValue) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch (_error) {
    return fallbackValue;
  }
};

const writeLocalJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const importExcel = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/api/admin/import-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then((response) => {
    clearApiCache();
    return response;
  });
};

export const getAdminTeachers = () =>
  getFirstSuccessful([
    '/api/admin/teachers',
    '/api/Admin/teachers',
  ]);

export const getAdminStudents = () =>
  getFirstSuccessful([
    '/api/admin/students',
    '/api/Admin/students',
  ]);

export const createTeacherAccount = (payload) =>
  getFirstSuccessful([
    { path: '/api/admin/teachers', method: 'post', data: payload },
    { path: '/api/Admin/teachers', method: 'post', data: payload },
  ]);

export const createStudentAccount = (payload) =>
  getFirstSuccessful([
    { path: '/api/admin/students', method: 'post', data: payload },
    { path: '/api/Admin/students', method: 'post', data: payload },
  ]);

export const deleteTeacherAccount = (teacherId) =>
  getFirstSuccessful([
    { path: `/api/admin/teachers/${teacherId}`, method: 'delete' },
    { path: `/api/Admin/teachers/${teacherId}`, method: 'delete' },
  ]);

export const deleteStudentAccount = (studentId) =>
  getFirstSuccessful([
    { path: `/api/admin/students/${studentId}`, method: 'delete' },
    { path: `/api/Admin/students/${studentId}`, method: 'delete' },
  ]);

export const getClassrooms = async () => {
  const backendResponse = await tryGetFirstSuccessful([
    '/api/admin/classes',
    '/api/Admin/classes',
    '/api/classes',
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  return {
    data: readLocalJson(CLASSROOMS_KEY, []),
  };
};

export const upsertClassroom = async (payload) => {
  const backendResponse = await tryGetFirstSuccessful([
    { path: '/api/admin/classes', method: 'post', data: payload },
    { path: '/api/Admin/classes', method: 'post', data: payload },
    { path: '/api/classes', method: 'post', data: payload },
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  const classrooms = readLocalJson(CLASSROOMS_KEY, []);
  const id = payload.id || payload.classId || payload.code;
  const index = classrooms.findIndex((item) => String(item.id || item.code) === String(id));
  const normalized = {
    id,
    code: payload.code || payload.classCode || payload.name,
    name: payload.name || payload.className || payload.code,
    teacherId: payload.teacherId || '',
    teacherName: payload.teacherName || '',
  };

  if (index >= 0) classrooms[index] = { ...classrooms[index], ...normalized };
  else classrooms.push(normalized);

  writeLocalJson(CLASSROOMS_KEY, classrooms);
  return { data: normalized };
};

export const assignTeacherToClassroom = async ({ classId, teacherId, teacherName }) => {
  const backendResponse = await tryGetFirstSuccessful([
    { path: `/api/admin/classes/${classId}/assign-teacher`, method: 'post', data: { teacherId } },
    { path: `/api/Admin/classes/${classId}/assign-teacher`, method: 'post', data: { teacherId } },
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  const classrooms = readLocalJson(CLASSROOMS_KEY, []);
  const index = classrooms.findIndex((item) => String(item.id || item.code) === String(classId));
  if (index >= 0) {
    classrooms[index] = {
      ...classrooms[index],
      teacherId,
      teacherName: teacherName || classrooms[index].teacherName || '',
    };
    writeLocalJson(CLASSROOMS_KEY, classrooms);
  }

  return { data: classrooms[index] || null };
};

export const getAdminEvaluations = async () => {
  const backendResponse = await tryGetFirstSuccessful([
    '/api/admin/evaluations',
    '/api/Evaluation',
    '/api/evaluations',
    '/evaluations',
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  return { data: [] };
};

export const getStudentRecommendations = async (studentId) => {
  const backendResponse = await tryGetFirstSuccessful([
    `/api/Recommendation/student/${studentId}`,
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  return { data: [] };
};

export const getStudentProgress = async (studentId) => {
  const backendResponse = await tryGetFirstSuccessful([
    `/api/Progress/student/${studentId}`,
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  return { data: null };
};

export const getStudentEvaluations = async (studentId) => {
  const backendResponse = await tryGetFirstSuccessful([
    `/api/evaluations/student/${studentId}`,
    `/api/Evaluation/student/${studentId}`,
    `/api/admin/evaluations/student/${studentId}`,
    `/api/teacher/evaluations/student/${studentId}`,
    `/evaluations/student/${studentId}`,
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  const all = readLocalJson(EVALUATIONS_KEY, {});
  return { data: all[String(studentId)] || [] };
};

export const saveStudentEvaluation = async ({ studentId, payload }) => {
  const backendResponse = await tryGetFirstSuccessful([
    { path: `/api/teacher/students/${studentId}/evaluations`, method: 'post', data: payload },
    { path: `/api/Teacher/students/${studentId}/evaluations`, method: 'post', data: payload },
  ]);

  if (backendResponse) {
    return backendResponse;
  }

  const all = readLocalJson(EVALUATIONS_KEY, {});
  const key = String(studentId);
  const existing = Array.isArray(all[key]) ? all[key] : [];
  const week = String(payload.week || 'final');
  const index = existing.findIndex((item) => String(item.week) === week);

  if (index >= 0) {
    existing[index] = { ...existing[index], ...payload, updatedAt: new Date().toISOString() };
  } else {
    existing.push({ ...payload, week, updatedAt: new Date().toISOString() });
  }

  existing.sort((a, b) => Number(a.weekOrder ?? a.week) - Number(b.weekOrder ?? b.week));
  all[key] = existing;
  writeLocalJson(EVALUATIONS_KEY, all);

  return { data: payload };
};

export const getResults = () =>
  cachedGet(
    'results',
    async () => {
      const directResponse = await tryGetFirstSuccessful([
        '/api/Admin/results',
        '/api/Admin/result',
        '/api/SoftSkill/results',
        '/api/results',
        '/api/result',
        '/api/students/results',
      ]);
      if (directResponse) {
        return wrapResponseData(directResponse, toArrayPayload(directResponse.data));
      }

      const teacherMeResponse = await tryGetFirstSuccessful([
        '/api/teacher/me',
        '/api/Teacher/me',
      ]);

      if (teacherMeResponse) {
        return wrapResponseData(teacherMeResponse, toArrayPayload(teacherMeResponse.data));
      }

      return { data: [] };
    },
    10000
  );

export const getTopStudents = (limit = 5) =>
  cachedGet(
    `top-students-${limit}`,
    async () => {
      const directResponse = await tryGetFirstSuccessful([
        `/api/SoftSkill/top?limit=${limit}`,
        `/api/SoftSkill/top?count=${limit}`,
        '/api/SoftSkill/top',
        `/api/results/top-students?limit=${limit}`,
        `/api/results/top?count=${limit}`,
        `/api/top-students?limit=${limit}`,
      ]);
      if (directResponse) {
        return wrapResponseData(directResponse, toArrayPayload(directResponse.data));
      }

      const resultsResponse = await getResults();
      const topStudents = [...toArrayPayload(resultsResponse.data)]
        .sort((a, b) => Number(b.score ?? b.result ?? 0) - Number(a.score ?? a.result ?? 0))
        .slice(0, limit);

      return wrapResponseData(resultsResponse, topStudents);
    },
    10000
  );

export const getStatistics = () =>
  cachedGet(
    'statistics',
    async () => {
      const directResponse = await tryGetFirstSuccessful([
        '/api/SoftSkill/statistics',
        '/api/results/statistics',
        '/api/statistics',
        '/api/results/summary',
      ]);
      if (directResponse) {
        return directResponse;
      }

      const resultsResponse = await getResults();
      const results = toArrayPayload(resultsResponse.data);

      const totalStudents = results.length;
      const totalScore = results.reduce((sum, item) => sum + Number(item.score ?? item.result ?? 0), 0);
      const averageScore = totalStudents > 0 ? totalScore / totalStudents : 0;

      const counts = results.reduce(
        (acc, item) => {
          const level = String(item.level || '').trim().toLowerCase();
          if (level === 'good') acc.good += 1;
          else if (level === 'weak') acc.weak += 1;
          else acc.average += 1;
          return acc;
        },
        { good: 0, average: 0, weak: 0 }
      );

      return wrapResponseData(resultsResponse, {
        totalStudents,
        averageScore,
        good: counts.good,
        average: counts.average,
        weak: counts.weak,
      });
    },
    10000
  );

export default api;
