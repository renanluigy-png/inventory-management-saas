import { DashboardLayoutRepository, WidgetConfig, DEFAULT_WIDGETS } from '../repositories/DashboardLayoutRepository';

export class DashboardLayoutService {
  private repo: DashboardLayoutRepository;
  constructor() { this.repo = new DashboardLayoutRepository(); }

  async getLayout(userId: string, companyId?: string) {
    let layout = await this.repo.findByUser(userId);
    if (!layout) {
      layout = await this.repo.createDefault(userId, companyId);
    }
    return layout;
  }

  async saveLayout(userId: string, widgets: WidgetConfig[], companyId?: string) {
    return this.repo.upsertDefault(userId, widgets, companyId);
  }

  async resetLayout(userId: string) {
    return this.repo.resetToDefault(userId);
  }

  getDefaultWidgets() {
    return DEFAULT_WIDGETS;
  }
}
