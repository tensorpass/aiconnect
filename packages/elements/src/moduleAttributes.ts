// Reads the attributes every element shares into the props of a module: the instructions, the MCP
// server, the copy, the language, the guards and the attachments. Lists, maps, the guards and the
// attachments are written as JSON in their attribute; one that does not parse is reported in the console
// and left out. `attachments` alone, with no value, takes every kind with the default caps. The module's
// heading is `heading`, since `title` would show as the browser's tooltip over the whole element.

import type { GuardPolicy } from '@tensorpass/aiconnect';
import type { AttachmentPolicy } from '@tensorpass/aiconnect/attachments';
import { builtInModuleMessages } from '@tensorpass/aiconnect-react';
import type { AiModuleProps, Locale } from '@tensorpass/aiconnect-react';

export const SHARED_ATTRIBUTES = [
  'system', 'mcp', 'heading', 'intro', 'placeholder', 'suggestions', 'tool-labels', 'locale', 'guards',
  'attachments',
];

function jsonAttribute<T>(element: HTMLElement, name: string, valid: (value: unknown) => value is T): T | undefined {
  const raw = element.getAttribute(name);
  if (raw === null) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (valid(value)) {
      return value;
    }
  } catch {
    // Reported below with the shape the attribute takes.
  }
  console.error(`<${element.localName}> ignores its ${name} attribute, which is not valid JSON of the right shape.`);
  return undefined;
}

const isStringList = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const isStringMap = (value: unknown): value is Record<string, string> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
  && Object.values(value).every((item) => typeof item === 'string')
);

const GUARD_LISTS = ['allowedLinkHosts', 'allowedEmails', 'denyPatterns', 'withholdPatterns', 'visibleTools'];
const GUARD_TEXTS = ['scope', 'safeAnswer'];

const isPattern = (value: string): boolean => {
  try {
    return Boolean(new RegExp(value));
  } catch {
    return false;
  }
};

// The guards in JSON: the fields of `GuardPolicy`, with each pattern a regular expression's source.
const isGuardPolicy = (value: unknown): value is GuardPolicy => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(([name, field]) => {
    if (GUARD_LISTS.includes(name)) {
      return isStringList(field) && (!name.endsWith('Patterns') || field.every(isPattern));
    }
    if (GUARD_TEXTS.includes(name)) {
      return typeof field === 'string';
    }
    return name === 'maxInputLength' && Number.isInteger(field) && (field as number) > 0;
  });
};

const ATTACHMENT_SWITCHES = ['images', 'files', 'voice'];
const ATTACHMENT_CAPS = ['maxBytes', 'maxFiles'];

// The attachments in JSON: the fields of `AttachmentPolicy`.
const isAttachmentPolicy = (value: unknown): value is AttachmentPolicy => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(([name, field]) => {
    if (ATTACHMENT_SWITCHES.includes(name)) {
      return typeof field === 'boolean';
    }
    if (ATTACHMENT_CAPS.includes(name)) {
      return Number.isInteger(field) && (field as number) > 0;
    }
    return name === 'accept' && isStringList(field);
  });
};

function attachmentsOf(element: HTMLElement): AttachmentPolicy | undefined {
  return element.getAttribute('attachments')?.trim() === ''
    ? {}
    : jsonAttribute(element, 'attachments', isAttachmentPolicy);
}

export function localeOf(element: HTMLElement): Locale {
  const locale = element.getAttribute('locale');
  if (locale === null) {
    return 'en';
  }
  if (locale in builtInModuleMessages) {
    return locale as Locale;
  }
  console.error(`<${element.localName}> speaks ${Object.keys(builtInModuleMessages).join(', ')}, not ${locale}.`);
  return 'en';
}

export function moduleProps(element: HTMLElement): Omit<AiModuleProps, 'tools'> {
  const text = (name: string) => element.getAttribute(name) ?? undefined;
  return {
    system: element.getAttribute('system') ?? '',
    mcp: text('mcp'),
    title: text('heading'),
    intro: text('intro'),
    placeholder: text('placeholder'),
    suggestions: jsonAttribute(element, 'suggestions', isStringList),
    toolLabels: jsonAttribute(element, 'tool-labels', isStringMap),
    guards: jsonAttribute(element, 'guards', isGuardPolicy),
    attachments: attachmentsOf(element),
  };
}
