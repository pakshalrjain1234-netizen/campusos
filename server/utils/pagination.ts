import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function parsePaginationParams(req: Request, defaultLimit: number = 25): PaginationParams {
  const pageRaw = parseInt(req.query.page as string, 10);
  const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

  const limitRaw = parseInt(req.query.limit as string, 10);
  // Upper limit 200 items per request to protect against high memory allocation
  const limit = isNaN(limitRaw) || limitRaw < 1 ? defaultLimit : Math.min(limitRaw, 200);

  const offset = (page - 1) * limit;

  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
  const sortOrder = (req.query.sortOrder === 'desc' || req.query.order === 'desc') ? 'desc' : 'asc';
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
    search,
  };
}

export function paginateArray<T>(
  items: T[],
  params: PaginationParams,
  filterFn?: (item: T, search: string) => boolean,
  sortFn?: (a: T, b: T, sortBy: string, sortOrder: 'asc' | 'desc') => number
): PaginatedResult<T> {
  let filtered = [...items];

  // 1. Search Filter
  if (params.search && filterFn) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter((item) => filterFn(item, s));
  }

  // 2. Sorting
  if (params.sortBy && sortFn) {
    filtered.sort((a, b) => sortFn(a, b, params.sortBy!, params.sortOrder));
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / params.limit) || 1;
  const sliced = filtered.slice(params.offset, params.offset + params.limit);

  return {
    data: sliced,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    },
  };
}

