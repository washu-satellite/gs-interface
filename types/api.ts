import { Request, Response } from 'express';

export type APIRouteMapping = Map<[string, 'GET' | 'POST' | 'DELETE'], (req: Request<{}, {}, {}, Record<string, any>>, res: Response) => void>;