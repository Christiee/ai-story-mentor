import React, { useState } from 'react';
import { X, Sparkles, Star, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { childrenApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/useAuth';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';

const AVATAR_ICONS = ['🦊', '🐰', '🐻', '🐱', '🐶', '🦄', '🦁', '🐼', '🐸', '⭐', '🌈', '🎈'];

const INTEREST_OPTIONS = ['恐龙', '公主', '太空', '汽车', '动物', '超级英雄', '画画', '音乐', '故事', '运动', '海洋', '魔法'];

interface AddChildModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (child: { id: string; name: string }) => void;
  submitText?: string;
}

const AddChildModal: React.FC<AddChildModalProps> = ({
  open,
  onClose,
  onCreated,
  submitText = '开始造故事',
}) => {
  const { requireLogin } = useAuth();
  const [step, setStep] = useState<'name' | 'avatar' | 'interests'>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState('6');
  const [avatar, setAvatar] = useState(AVATAR_ICONS[0]);
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  if (!open) return null;

  const handleNext = (): void => {
    if (step === 'name') {
      if (!name.trim()) {
        setNameError('宝宝叫什么呀？');
        return;
      }
      if (name.trim().length > 10) {
        setNameError('名字太长啦，短一点好不好？');
        return;
      }
      setNameError('');
      setStep('avatar');
    } else if (step === 'avatar') {
      setStep('interests');
    }
  };

  const handlePrev = (): void => {
    if (step === 'avatar') setStep('name');
    if (step === 'interests') setStep('avatar');
  };

  const toggleInterest = (interest: string): void => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
          ? [...prev, interest]
          : prev,
    );
  };

  const handleSubmit = async (): Promise<void> => {
    if (!requireLogin()) return;
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const ageNum = parseInt(age, 10) || 6;
      const child = await childrenApi.createChild({
        name: name.trim(),
        age: ageNum,
        avatar,
        interests: interests.length > 0 ? interests : undefined,
      });
      toast.success('宝贝档案建好啦！');
      onCreated(child);
      handleReset();
    } catch (err) {
      logger.error('创建宝贝档案失败', err);
      toast.error('哎呀，没创建成功，再试一下好不好？');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = (): void => {
    setName('');
    setAge('6');
    setAvatar(AVATAR_ICONS[0]);
    setInterests([]);
    setStep('name');
    setNameError('');
  };

  const handleClose = (): void => {
    handleReset();
    onClose();
  };

  const totalSteps = 3;
  const stepIndex = step === 'name' ? 0 : step === 'avatar' ? 1 : 2;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* 顶部装饰 */}
        <div className="relative h-24 bg-gradient-to-br from-[#E1F5EE] via-white to-[#FAEEDA] flex items-center justify-center">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-[#5f6368] hover:bg-white hover:text-[#1a1d1f] transition-all"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#0F6E56]" />
            <span className="text-xl font-bold text-[#085041]">
              认识一下小作家
            </span>
            <Star className="w-6 h-6 text-[#BA7517] fill-[#BA7517]" />
          </div>
        </div>

        {/* 进度条 */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#5f6368]">
              {stepIndex + 1} / {totalSteps} 步
            </span>
            <span className="text-xs text-[#0F6E56] font-medium">
              马上就好
            </span>
          </div>
          <div className="w-full h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0F6E56] to-[#BA7517] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-5">
          {step === 'name' && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#1a1d1f] mb-1">
                  宝宝叫什么呀？
                </h2>
                <p className="text-[#5f6368] text-sm">
                  导师会记住宝宝的名字，叫起来更亲切哦
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1d1f] mb-2">
                    昵称 <span className="text-[#A32D2D]">*</span>
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="比如：小豆豆"
                    maxLength={10}
                    className="h-12 text-lg rounded-xl text-center font-medium border-[#e5e7eb] focus:border-[#0F6E56] focus:ring-[#0F6E56]/10"
                    autoFocus
                  />
                  {nameError && (
                    <p className="mt-1.5 text-[13px] text-[#A32D2D] text-center">
                      {nameError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1d1f] mb-2">
                    几岁啦？
                  </label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {['5', '6', '7', '8', '9', '10'].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAge(a)}
                        className={`w-12 h-12 rounded-xl text-lg font-semibold transition-all ${
                          age === a
                            ? 'bg-[#0F6E56] text-white shadow-md'
                            : 'bg-[#f6f7f9] text-[#1a1d1f] hover:bg-[#E1F5EE]'
                        }`}
                      >
                        {a}岁
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNext}
                disabled={!name.trim() || !!nameError}
                className="w-full h-12 rounded-xl bg-[#0F6E56] hover:bg-[#085041] text-white text-lg font-medium"
              >
                下一步
                <Heart className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 'avatar' && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#1a1d1f] mb-1">
                  选个可爱的头像吧
                </h2>
                <p className="text-[#5f6368] text-sm">
                  选一个你最喜欢的小动物或星星
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {AVATAR_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setAvatar(icon)}
                    className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all ${
                      avatar === icon
                        ? 'bg-[#E1F5EE] ring-2 ring-[#0F6E56] scale-110'
                        : 'bg-[#f6f7f9] hover:bg-[#E1F5EE]/50'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1 h-12 rounded-xl"
                >
                  上一步
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 h-12 rounded-xl bg-[#0F6E56] hover:bg-[#085041] text-white font-medium"
                >
                  下一步
                </Button>
              </div>
            </div>
          )}

          {step === 'interests' && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#1a1d1f] mb-1">
                  喜欢什么呢？
                </h2>
                <p className="text-[#5f6368] text-sm">
                  选几个兴趣，导师会讲你爱听的故事（可选，最多5个）
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {INTEREST_OPTIONS.map((interest) => {
                  const selected = interests.includes(interest);
                  const disabled = !selected && interests.length >= 5;
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      disabled={disabled}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selected
                          ? 'bg-[#0F6E56] text-white'
                          : disabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#E1F5EE]/60 text-[#0F6E56] hover:bg-[#E1F5EE]'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-xs text-[#5f6368]">
                已选 {interests.length} / 5 个
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1 h-12 rounded-xl"
                >
                  上一步
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#0F6E56] to-[#085041] text-white font-medium"
                >
                  {submitting ? '创建中...' : submitText}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddChildModal;
