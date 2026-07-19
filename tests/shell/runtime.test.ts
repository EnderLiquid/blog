import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ShellNavigationProjection } from '../../shared/site-projections/shell.ts';
import {
  findClosestNavigableAncestor,
  findShellResourceByPublicPath,
  findShellResourceByVirtualPath,
  parseShellLocation,
  publicFullPathForResource,
  resolveVirtualInput,
} from '../../app/shell/navigation-index.ts';
import { reconcileNavigationIntents } from '../../app/shell/navigation-intents.ts';
import { parseShellCommand } from '../../app/shell/parser.ts';
import { translateRouteToShellCommand } from '../../app/shell/route-translator.ts';
import type { PendingNavigationIntent } from '../../app/shell/types.ts';

const projection: ShellNavigationProjection = {
  version: 1,
  resources: [
    {
      resourceId: 'static:home:en',
      publicPath: '/en/',
      virtualPath: '/',
      localeCode: 'en',
      kind: 'home',
    },
    {
      resourceId: 'static:posts:en',
      publicPath: '/en/posts/',
      virtualPath: '/posts/',
      localeCode: 'en',
      kind: 'posts',
      navigableParentPath: '/',
    },
    {
      resourceId: 'article:examples/hello-world:en',
      publicPath: '/en/posts/examples/hello-world/',
      virtualPath: '/posts/examples/hello-world/',
      localeCode: 'en',
      kind: 'article',
      articleKeyPath: 'examples/hello-world',
      title: 'The environment is ready',
      navigableParentPath: '/posts/',
    },
    {
      resourceId: 'static:home:zh-cn',
      publicPath: '/zh-cn/',
      virtualPath: '/',
      localeCode: 'zh-cn',
      kind: 'home',
    },
    {
      resourceId: 'static:posts:zh-cn',
      publicPath: '/zh-cn/posts/',
      virtualPath: '/posts/',
      localeCode: 'zh-cn',
      kind: 'posts',
      navigableParentPath: '/',
    },
    {
      resourceId: 'article:examples/hello-world:zh-cn',
      publicPath: '/zh-cn/posts/examples/hello-world/',
      virtualPath: '/posts/examples/hello-world/',
      localeCode: 'zh-cn',
      kind: 'article',
      articleKeyPath: 'examples/hello-world',
      title: '环境已经就绪',
      navigableParentPath: '/posts/',
    },
  ],
};

describe('Shell命令解析', () => {
  it('支持引号、空参数和反斜杠转义', () => {
    assert.deepEqual(parseShellCommand('search "Nuxt Content"'), {
      name: 'search',
      args: ['Nuxt Content'],
    });
    assert.deepEqual(parseShellCommand("search '多语言 文章'"), {
      name: 'search',
      args: ['多语言 文章'],
    });
    assert.deepEqual(parseShellCommand('search Nuxt\\ Content'), {
      name: 'search',
      args: ['Nuxt Content'],
    });
    assert.deepEqual(parseShellCommand('search ""'), { name: 'search', args: [''] });
    assert.equal(parseShellCommand('   '), undefined);
  });

  it('拒绝未闭合引号和命令末尾转义符', () => {
    assert.throws(() => parseShellCommand('search "nuxt'), /未闭合/);
    assert.throws(() => parseShellCommand('search nuxt\\'), /转义符/);
  });
});

describe('Shell虚拟路径', () => {
  it('从公开URL派生语言、虚拟路径、query与Hash', () => {
    assert.deepEqual(parseShellLocation('/zh-cn/posts/?q=nuxt#result'), {
      localeCode: 'zh-cn',
      virtualPath: '/posts/',
      search: '?q=nuxt',
      hash: '#result',
      fullPath: '/zh-cn/posts/?q=nuxt#result',
    });
    assert.equal(parseShellLocation('/404.html'), undefined);
  });

  it('解析绝对路径、相对路径和query，并拒绝协议URL', () => {
    assert.deepEqual(resolveVirtualInput('../', '/posts/'), {
      virtualPath: '/',
      search: '',
      hash: '',
    });
    assert.deepEqual(resolveVirtualInput('?a=b#result', '/posts/'), {
      virtualPath: '/posts/',
      search: '?a=b',
      hash: '#result',
    });
    assert.throws(() => resolveVirtualInput('https://example.com', '/'), /URL协议/);
    assert.throws(() => resolveVirtualInput('//example.com/posts/', '/'), /离开当前站点/);
    assert.throws(() => resolveVirtualInput('../../', '/posts/'), /虚拟根/);
  });

  it('根据语言查找资源并为不可导航前缀回退最近祖先', () => {
    const posts = findShellResourceByVirtualPath(projection, 'zh-cn', '/posts/');
    const ancestor = findClosestNavigableAncestor(projection, 'zh-cn', '/posts/examples/');

    assert.equal(posts?.kind, 'posts');
    assert.equal(findShellResourceByPublicPath(projection, '/zh-cn/posts?q=nuxt')?.kind, 'posts');
    assert.equal(ancestor?.virtualPath, '/posts/');
    assert.equal(
      publicFullPathForResource(posts!, '?q=nuxt', '#result'),
      '/zh-cn/posts/?q=nuxt#result',
    );
  });
});

describe('待处理导航意图', () => {
  it('完成最新匹配意图并取消它之前的意图', () => {
    const intents = createIntents('/zh-cn/posts/', '/zh-cn/', '/zh-cn/posts/');
    const result = reconcileNavigationIntents(intents, '/zh-cn/posts/');

    assert.deepEqual(result.transitions, [
      { id: 1, status: 'cancelled', reason: 'superseded-by-later-intent' },
      { id: 2, status: 'cancelled', reason: 'superseded-by-later-intent' },
      { id: 3, status: 'completed' },
    ]);
    assert.deepEqual(result.remainingIntents, []);
    assert.equal(result.shouldTranslateRoute, false);
  });

  it('保留匹配项之后的意图', () => {
    const intents = createIntents('/zh-cn/', '/zh-cn/posts/');
    const result = reconcileNavigationIntents(intents, '/zh-cn/');

    assert.deepEqual(result.transitions, [{ id: 1, status: 'completed' }]);
    assert.deepEqual(result.remainingIntents, [intents[1]]);
  });

  it('没有匹配项时取消所有意图并要求转译Route', () => {
    const result = reconcileNavigationIntents(createIntents('/zh-cn/posts/', '/zh-cn/'), '/en/');

    assert.equal(result.shouldTranslateRoute, true);
    assert.deepEqual(
      result.transitions.map((transition) => transition.status),
      ['cancelled', 'cancelled'],
    );
    assert.deepEqual(result.remainingIntents, []);
  });
});

describe('普通Route转译', () => {
  it('转译初始页面、语言切换和文章路径', () => {
    assert.equal(
      translateRouteToShellCommand(
        projection,
        '/zh-cn/posts/examples/hello-world/?a=%E5%A4%9A%E8%AF%AD%E8%A8%80',
      ),
      'cd /posts/examples/hello-world/?a=多语言',
    );
    assert.equal(
      translateRouteToShellCommand(projection, '/en/posts/?q=nuxt', '/zh-cn/posts/?q=nuxt'),
      'lang en',
    );
  });

  it('仅将可无损表达的文章列表查询转译为search', () => {
    assert.equal(
      translateRouteToShellCommand(projection, '/zh-cn/posts/?q=Nuxt%20Content', '/zh-cn/posts/'),
      'search "Nuxt Content"',
    );
    assert.equal(
      translateRouteToShellCommand(projection, '/zh-cn/posts/', '/zh-cn/posts/?q=nuxt'),
      'search',
    );
    assert.equal(
      translateRouteToShellCommand(projection, '/zh-cn/posts/?q=nuxt&a=b', '/zh-cn/posts/'),
      'cd /posts/?q=nuxt&a=b',
    );
  });
});

function createIntents(...targets: string[]): PendingNavigationIntent[] {
  return targets.map((targetFullPath, index) => ({
    id: index + 1,
    commandHistoryEntryId: index + 101,
    targetFullPath,
  }));
}
