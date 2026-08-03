import type { MarkdownRoot, MinimarkElement, MinimarkNode } from '@nuxt/content';

export interface FootnoteMessages {
  footnotes: string;
  backToReference: (reference: string) => string;
}

/**
 * 将Markdown解析器固定生成的英文脚注辅助文案，投影为当前页面的界面语言。
 *
 * Content数据库中的Minimark树可能同时被不同语言的回退投递页复用，因此不能原地修改。
 */
export function localizeFootnotes(root: MarkdownRoot, messages: FootnoteMessages): MarkdownRoot {
  const context = {
    messages,
    backReferenceCount: 0,
  };

  return {
    ...root,
    value: root.value.map((node) => localizeNode(node, context)),
  };
}

interface FootnoteLocalizationContext {
  messages: FootnoteMessages;
  backReferenceCount: number;
}

function localizeNode(
  node: MinimarkNode,
  context: FootnoteLocalizationContext,
  withinFootnotes = false,
): MinimarkNode {
  if (!isElement(node)) {
    return node;
  }

  const [tag, props, ...children] = node;
  const isFootnoteSection = tag === 'section' && hasClass(props, 'footnotes');
  const nextWithinFootnotes = withinFootnotes || isFootnoteSection;
  const nextProps = localizeProps(tag, props, context, nextWithinFootnotes, isFootnoteSection);
  const nextChildren = children.map<MinimarkNode>((child) => {
    if (nextWithinFootnotes && isFootnoteHeading(child)) {
      return [
        'h2',
        { ...child[1], className: ['article-footnotes__title'] },
        context.messages.footnotes,
      ];
    }

    return localizeNode(child, context, nextWithinFootnotes);
  });

  return [tag, nextProps, ...nextChildren];
}

function localizeProps(
  tag: string,
  props: Record<string, unknown>,
  context: FootnoteLocalizationContext,
  withinFootnotes: boolean,
  isFootnoteSection: boolean,
): Record<string, unknown> {
  if (isFootnoteSection) {
    return {
      ...props,
      className: appendClass(props, 'article-footnotes'),
    };
  }

  if (tag === 'a' && 'dataFootnoteRef' in props) {
    return {
      ...props,
      className: appendClass(props, 'article-footnotes__reference'),
    };
  }

  if (withinFootnotes && tag === 'li' && typeof props.id === 'string') {
    return {
      ...props,
      className: appendClass(props, 'article-footnotes__item'),
    };
  }

  if (withinFootnotes && tag === 'a' && 'dataFootnoteBackref' in props) {
    context.backReferenceCount += 1;
    const reference = referenceFromAriaLabel(props.ariaLabel) ?? String(context.backReferenceCount);

    return {
      ...props,
      ariaLabel: context.messages.backToReference(reference),
      className: appendClass(props, 'article-footnotes__backref'),
    };
  }

  return props;
}

function isElement(node: MinimarkNode): node is MinimarkElement {
  return Array.isArray(node);
}

function isFootnoteHeading(node: MinimarkNode): node is MinimarkElement {
  return isElement(node) && node[0] === 'h2' && node[1].id === 'footnote-label';
}

function hasClass(props: Record<string, unknown>, className: string): boolean {
  return classNames(props).includes(className);
}

function appendClass(props: Record<string, unknown>, className: string): string[] {
  return [...new Set([...classNames(props), className])];
}

function classNames(props: Record<string, unknown>): string[] {
  return Array.isArray(props.className)
    ? props.className.filter((className): className is string => typeof className === 'string')
    : [];
}

function referenceFromAriaLabel(ariaLabel: unknown): string | undefined {
  if (typeof ariaLabel !== 'string') {
    return undefined;
  }

  return ariaLabel.match(/(\d+(?:-\d+)*)$/)?.[1];
}
