export type ErrorHandleOptions = {
  onAxiosError?: (error: string) => void;
  onOtherError?: (error: string) => void;
};

export type SearchLimitOffset = {
  limit: number;
  offset: number;
  search: string;
};

export type SearchLimitOffsetToken = SearchLimitOffset & {
  token: string | null;
};

export type IDLimitOffsetToken = {
  user_id: number;
  limit: number;
  offset: number;
  token: string | null;
};

export type IDLimitOffsetTokenSearch = IDLimitOffsetToken & {
  search: string;
};

export type IDLimitOffsetSearch = SearchLimitOffset & {
  user_id: number;
};
