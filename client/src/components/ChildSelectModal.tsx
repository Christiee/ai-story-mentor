import React from 'react';
import { X, User, Plus } from 'lucide-react';
import type { ChildProfile } from '@shared/api.interface';

interface ChildSelectModalProps {
  open: boolean;
  children: ChildProfile[];
  onSelect: (childId: string) => void;
  onClose: () => void;
  onAddChild: () => void;
}

const ChildSelectModal: React.FC<ChildSelectModalProps> = ({
  open,
  children,
  onSelect,
  onClose,
  onAddChild,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative h-24 bg-gradient-to-br from-[#E1F5EE] via-white to-[#FAEEDA] flex items-center justify-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-[#5f6368] hover:bg-white hover:text-[#1a1d1f] transition-all"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-[#085041]">
            今天谁来讲故事呀？
          </h2>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-[#e5e7eb] hover:border-[#0F6E56] hover:bg-[#E1F5EE]/20 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E1F5EE] to-[#0F6E56]/20 flex items-center justify-center text-2xl flex-shrink-0">
                {child.avatar || <User className="w-7 h-7 text-[#0F6E56]" />}
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-lg text-[#1a1d1f]">
                  {child.name}
                </div>
                <div className="text-sm text-[#5f6368]">
                  {child.age}岁
                  {child.interests && child.interests.length > 0 && (
                    <span className="ml-2">· 喜欢{child.interests.slice(0, 2).join('、')}</span>
                  )}
                </div>
              </div>
              <div className="text-[#0F6E56] opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                选TA →
              </div>
            </button>
          ))}

          <button
            onClick={onAddChild}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[#E1F5EE] text-[#0F6E56] font-medium hover:bg-[#E1F5EE]/20 hover:border-[#0F6E56]/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            添加新宝贝
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChildSelectModal;
