import React from 'react';
import { Mic, RefreshCw, MessageCircle, Keyboard } from 'lucide-react';

interface ChatInputAreaProps {
  isRecording: boolean;
  isAsrSupported: boolean;
  recognizedText: string;
  transcript: string;
  asrError: string | null;
  sending: boolean;
  starting: boolean;
  input: string;
  showTextInput: boolean;
  quickAnswers: string[];
  duration: number;
  onMicStart: () => void;
  onMicStop: () => void;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  onToggleTextInput: () => void;
  onQuickAnswer: (answer: string) => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  isRecording,
  isAsrSupported,
  recognizedText,
  transcript,
  asrError,
  sending,
  starting,
  input,
  showTextInput,
  quickAnswers,
  duration,
  onMicStart,
  onMicStop,
  onInputChange,
  onSend,
  onToggleTextInput,
  onQuickAnswer,
}) => {
  const displayText = recognizedText || transcript;

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const micDisabled = sending || starting;

  return (
    <div className="border-t border-[#e5e7eb] bg-white px-6 py-5 rounded-b-2xl">
      {quickAnswers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {quickAnswers.map((answer, index) => (
            <button
              key={`${answer}-${index}`}
              onClick={() => onQuickAnswer(answer)}
              disabled={sending || starting}
              className="px-4 py-2 rounded-full bg-[#E1F5EE] text-[#0F6E56] text-sm font-medium hover:bg-[#0F6E56] hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {answer}
            </button>
          ))}
        </div>
      )}

      {displayText && (
        <div className="text-center mb-3 text-sm text-[#5f6368]">
          <span className="text-[#0F6E56] font-medium">听到了：</span>
          {displayText}
        </div>
      )}

      {asrError && (
        <div className="text-center mb-3 text-sm text-[#A32D2D] bg-[#FCEBEB] rounded-lg py-2 px-3">
          {asrError}
        </div>
      )}

      {isAsrSupported ? (
        <div className="flex flex-col items-center gap-3">
          <button
            onPointerDown={(e: React.PointerEvent) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              onMicStart();
            }}
            onPointerUp={(e: React.PointerEvent) => {
              e.preventDefault();
              onMicStop();
            }}
            onPointerCancel={(e: React.PointerEvent) => {
              e.preventDefault();
              if (isRecording) onMicStop();
            }}
            onPointerLeave={(e: React.PointerEvent) => {
              if (e.buttons === 0 && !isRecording) return;
            }}
            disabled={micDisabled}
            style={{ touchAction: 'none' }}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none ${
              isRecording
                ? 'bg-[#A32D2D] scale-110 shadow-lg shadow-red-200'
                : 'bg-[#0F6E56] hover:bg-[#085041] hover:scale-105 shadow-lg shadow-green-200'
            }`}
          >
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full border-4 border-[#A32D2D]/50 animate-ping" />
                <span className="absolute -inset-2 rounded-full border-2 border-[#A32D2D]/30 animate-pulse" />
                <span className="absolute -inset-4 rounded-full border border-[#A32D2D]/20 animate-pulse [animation-delay:0.5s]" />
              </>
            )}
            <Mic className="w-10 h-10 text-white relative z-10" />
          </button>
          <p className="text-[#5f6368] text-base font-medium">
            {isRecording ? (
              <span className="text-[#A32D2D] flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#A32D2D] animate-pulse" />
                正在听... {duration}s · 松开发送
              </span>
            ) : sending || starting ? (
              '导师思考中...'
            ) : (
              '按住说话，松开发送'
            )}
          </p>

          <button
            onClick={onToggleTextInput}
            className="text-sm text-[#5f6368] hover:text-[#0F6E56] inline-flex items-center gap-1 transition-colors mt-1"
          >
            {showTextInput ? (
              <>
                <Mic className="w-4 h-4" />
                用语音回答
              </>
            ) : (
              <>
                <Keyboard className="w-4 h-4" />
                不方便说话？点这里打字
              </>
            )}
          </button>

          {showTextInput && (
            <div className="w-full flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  onInputChange(e.target.value)
                }
                onKeyDown={handleTextareaKeyDown}
                placeholder="说你的想法..."
                rows={2}
                className="flex-1 resize-none px-4 py-3 rounded-xl border-2 border-[#e5e7eb] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 text-lg"
                disabled={sending || starting}
              />
              <button
                onClick={() => onSend()}
                disabled={!input.trim() || sending || starting}
                className="w-12 h-12 rounded-xl bg-[#0F6E56] hover:bg-[#085041] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onInputChange(e.target.value)
              }
              onKeyDown={handleTextareaKeyDown}
              placeholder="说你的想法..."
              rows={3}
              className="flex-1 resize-none px-4 py-3 rounded-xl border-2 border-[#e5e7eb] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 text-lg"
              disabled={sending || starting}
            />
            <button
              onClick={() => onSend()}
              disabled={!input.trim() || sending || starting}
              className="w-12 h-12 rounded-xl bg-[#0F6E56] hover:bg-[#085041] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 active:scale-95"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInputArea;
