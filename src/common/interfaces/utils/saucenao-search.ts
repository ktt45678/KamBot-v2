export interface SaucenaoSearchResponse {
  header: UserHeader;
  results: SauceResult[];
}

export interface SauceResult {
  header: ResultHeader;
  data: ResultData;
}

export interface ResultData {
  ext_urls: string[];
  danbooru_id?: number;
  creator?: string;
  material?: string;
  characters?: string;
  source?: string;
  md_id?: string;
  mu_id?: number;
  mal_id?: number;
  part?: string;
  artist?: string;
  author?: string;
  title?: string;
  pixiv_id?: number;
  member_name?: string;
  member_id?: number;
  author_name?: string;
  twitter_user_handle?: string;
}

export interface ResultHeader {
  similarity: string;
  thumbnail: string;
  index_id: number;
  index_name: string;
  dupes: number;
  hidden: number;
}

export interface UserHeader {
  user_id: string;
  account_type: string;
  short_limit: string;
  long_limit: string;
  long_remaining: number;
  short_remaining: number;
  status: number;
  results_requested: number;
  index: Index;
  search_depth: string;
  minimum_similarity: number;
  query_image_display: string;
  query_image: string;
  results_returned: number;
}

export interface Index {
  [key: string]: IndexData;
}

interface IndexData {
  status: number;
  parent_id: number;
  id: number;
  results: number;
}