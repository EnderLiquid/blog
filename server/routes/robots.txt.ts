import { defineEventHandler, setResponseHeader } from 'h3';
import { createRobotsView } from '../../shared/site-manifest/views';
import { readSiteManifest } from '../utils/site-manifest';
import { renderRobotsTxt } from '../utils/robots';

export default defineEventHandler(async (event) => {
  const manifest = await readSiteManifest();
  const robotsView = createRobotsView(manifest);

  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return renderRobotsTxt(robotsView);
});
