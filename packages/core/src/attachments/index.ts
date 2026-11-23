// What a site's page does with the files a visitor attaches: the policy it sets, the check of each file,
// and the reading that turns a file into the parts the answering model reads.

export {
  acceptsType, attachmentsOn, checkAttachment, DEFAULT_MAX_ATTACHMENT_BYTES, DEFAULT_MAX_ATTACHMENTS, fitsQuestion,
  MAX_READ_BYTES, mediaTypeOf,
} from './attachmentPolicy.ts';
export type {
  AttachmentCheck, AttachmentKind, AttachmentPolicy, AttachmentRefusal, FileFacts,
} from './attachmentPolicy.ts';
export { IMAGE_LONG_SIDE, UnreadableFileError } from './imagePrep.ts';
export { partsForModel, prepareAttachment, readsAttachment, UNKNOWN_READS } from './preparedAttachment.ts';
export type { ModelParts, PreparedAttachment } from './preparedAttachment.ts';
