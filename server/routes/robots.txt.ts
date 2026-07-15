import { defineEventHandler, setResponseHeader } from 'h3';
import { renderRobotsTxt } from '../utils/robots';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return renderRobotsTxt();
});
