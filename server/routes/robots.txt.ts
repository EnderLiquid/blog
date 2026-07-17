import { defineEventHandler, setResponseHeader } from 'h3';
import { readRobotsProjection } from '../utils/site-projections';
import { renderRobotsTxt } from '../utils/robots';

export default defineEventHandler(async (event) => {
  const robotsView = await readRobotsProjection();

  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return renderRobotsTxt(robotsView);
});
