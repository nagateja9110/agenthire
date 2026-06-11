const analyticsService = require('../analytics/analytics.service');
const { ok } = require('../utils/response');

async function overview(req, res) {
  const data = await analyticsService.getOverview(req.user._id);
  return ok(res, data);
}

module.exports = { overview };
