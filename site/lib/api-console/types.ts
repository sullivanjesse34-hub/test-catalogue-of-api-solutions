/**
 * Shared types for the demo "API view" — the console that surfaces the Meta
 * Marketing API calls a solution would make as the user clicks through a demo.
 *
 * UI prototype only: these records describe calls that a real integration would
 * make; no real Marketing API request is ever issued.
 */

export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT';

export type ApiCallStatus = 'pending' | 'success' | 'error';

export interface ApiCall {
  id: string;
  /** Monotonic sequence for stable ordering (newest = highest). */
  seq: number;
  method: HttpMethod;
  /** Graph path, e.g. "cat_901234/items_batch". */
  endpoint: string;
  /** Human-readable description of what the call does. */
  summary?: string;
  /** Request params / body (must be JSON-serialisable). */
  request?: unknown;
  /** Representative response the API would return (mock). */
  response?: unknown;
  status: ApiCallStatus;
  /** Link to the developer doc for this API. */
  docsUrl?: string;
}

/** A call to be recorded — id and seq are assigned by the console. */
export type ApiCallInput = Omit<ApiCall, 'id' | 'seq'>;
