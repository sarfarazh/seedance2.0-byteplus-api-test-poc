import { StructuredPrompt } from '@/types/app';
export const toStructuredText=(p:StructuredPrompt)=>`Subject: ${p.subject}\nSetting: ${p.setting}\nAction: ${p.action}\nCamera: ${p.camera}\nLighting / Style: ${p.lightingStyle}\nAudio: ${p.audio}\nConstraints: ${p.constraints}`;
