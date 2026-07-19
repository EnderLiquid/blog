import type { LocaleCode } from '../../shared/i18n/locales.ts';

interface ShellMessages {
  open: string;
  close: string;
  terminal: string;
  returnToPage: string;
  inputLabel: string;
  help: string;
  unknownCommand(command: string): string;
  pathNotFound(path: string): string;
  translationMissing: string;
  usage(command: string): string;
}

export const SHELL_MESSAGES: Record<LocaleCode, ShellMessages> = {
  'zh-cn': {
    open: '打开终端',
    close: '收起终端',
    terminal: '站点终端',
    returnToPage: '返回页面',
    inputLabel: '输入终端命令',
    help: [
      'help                 显示命令帮助',
      'pwd                  显示当前虚拟路径',
      'url                  显示当前浏览器URL',
      'ls [path]            列出可访问页面',
      'cd <path>            导航到页面',
      'search [query]       搜索或浏览全部文章',
      'lang <zh-cn|en>      切换页面语言',
      'history              显示本次会话命令',
      'clear                清空终端输出',
    ].join('\n'),
    unknownCommand: (command) => `未知命令：“${command}”。输入 help 查看可用命令。`,
    pathNotFound: (path) => `路径不存在或不可导航：“${path}”。`,
    translationMissing: '当前页面没有目标语言版本。',
    usage: (command) => `用法：${command}`,
  },
  en: {
    open: 'Open terminal',
    close: 'Collapse terminal',
    terminal: 'Site terminal',
    returnToPage: 'Return to page',
    inputLabel: 'Enter a terminal command',
    help: [
      'help                 Show command help',
      'pwd                  Print the virtual path',
      'url                  Print the browser URL',
      'ls [path]            List navigable pages',
      'cd <path>            Navigate to a page',
      'search [query]       Search or browse all posts',
      'lang <zh-cn|en>      Switch the page language',
      'history              Show session commands',
      'clear                Clear terminal output',
    ].join('\n'),
    unknownCommand: (command) =>
      `Unknown command: “${command}”. Enter help for available commands.`,
    pathNotFound: (path) => `Path does not exist or cannot be navigated: “${path}”.`,
    translationMissing: 'This page does not have a version in the target language.',
    usage: (command) => `Usage: ${command}`,
  },
};
