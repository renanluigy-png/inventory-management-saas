import { Request, Response } from 'express';
import { SearchService } from '../services/SearchService';

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  search = async (req: Request, res: Response): Promise<void> => {
    const query = (req.query.q as string) ?? '';
    const result = await this.searchService.search(query);
    res.status(200).json({ status: 'success', data: result });
  };
}
