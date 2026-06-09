import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Star, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { User } from '../types';
import { DB } from '../services/dbService';

interface PricingProps {
  user: User;
  onClose: () => void;
  onUserUpdate?: (user: User) => void;
}

const Pricing: React.FC<PricingProps> = ({ user, onClose, onUserUpdate }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const plans = [
    {
      id: 'free',
      name: 'Boshlang\'ich',
      price: '0',
      description: 'Platforma bilan tanishish uchun',
      features: [
        'Oyiga 5 ta diktant tekshirish',
        'Cheklangan AI yordamchisi',
        'Asosiy natijalar tahlili',
        '1 ta sinf boshqaruvi'
      ],
      buttonText: 'Hozirgi tarif',
      isCurrent: !user.isPro,
      color: 'gray'
    },
    {
      id: 'pro_monthly',
      name: 'Pro (Oylik)',
      price: '49,000',
      priceId: 'price_monthly_id',
      description: 'Faol ustozlar uchun mukammal tanlov',
      features: [
        'Cheksiz diktant tekshirish',
        'To\'liq AI tahlili va tavsiyalar',
        'Cheksiz sinf va o\'quvchilar',
        'Ovozli diktantlar yaratish',
        'Eksport va hisobotlar'
      ],
      buttonText: 'Pro-ga o\'tish',
      isCurrent: user.isPro && user.subscriptionStatus === 'active',
      popular: true,
      color: 'indigo'
    },
    {
      id: 'pro_yearly',
      name: 'Pro (Yillik)',
      price: '399,000',
      priceId: 'price_yearly_id',
      description: 'Eng foydali va uzoq muddatli reja',
      features: [
        'Pro tarifining barcha imkoniyatlari',
        '30% tejash (oyiga ~33k)',
        'Premium qo\'llab-quvvatlash',
        'Yangi funksiyalarga birinchi kirish'
      ],
      buttonText: 'Yillik rejani tanlash',
      isCurrent: false,
      color: 'emerald'
    }
  ];

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handleFakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(selectedPlan.id);
    
    try {
      // Simulyatsiya qilingan kechikish
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedUser: User = {
        ...user,
        isPro: true,
        subscriptionStatus: 'active'
      };

      await DB.updateUser(user.id, { 
        isPro: true, 
        subscriptionStatus: 'active' 
      });

      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }

      alert("Tabriklaymiz! To'lov muvaffaqiyatli amalga oshirildi (Demo). Siz endi Pro foydalanuvchisiz!");
      onClose();
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko\'ring.');
    } finally {
      setLoading(null);
    }
  };

  if (step === 'payment' && selectedPlan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep('plans')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold">
                <ArrowRight className="w-4 h-4 rotate-180" /> Orqaga
              </button>
              <h3 className="font-black text-slate-900">To'lov ma'lumotlari</h3>
              <div className="w-8" />
            </div>

            <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Tanlangan reja</span>
                <span className="text-xs font-black text-indigo-600 uppercase">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">To'lov miqdori</span>
                <span className="text-lg font-black text-slate-900">{selectedPlan.price} so'm</span>
              </div>
            </div>

            <form onSubmit={handleFakePayment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Karta egasi</label>
                <input 
                  required
                  type="text"
                  placeholder="ISM FAMILIYA"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm uppercase"
                  value={cardData.name}
                  onChange={e => setCardData({...cardData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Karta raqami</label>
                <input 
                  required
                  type="text"
                  placeholder="8600 **** **** ****"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  value={cardData.number}
                  onChange={e => setCardData({...cardData, number: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Muddati</label>
                  <input 
                    required
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                    value={cardData.expiry}
                    onChange={e => setCardData({...cardData, expiry: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CVV</label>
                  <input 
                    required
                    type="password"
                    placeholder="***"
                    maxLength={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                    value={cardData.cvv}
                    onChange={e => setCardData({...cardData, cvv: e.target.value})}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading !== null}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>To'lash</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[10px] text-slate-400 text-center mt-6 font-medium">
              <ShieldCheck className="w-3 h-3 inline mr-1" /> 
              Xavfsiz demo to'lov tizimi. Hech qanday real pul yechilmaydi.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Tarifni tanlang</h2>
              <p className="text-gray-500">O'zingizga mos rejani tanlang va platforma imkoniyatlaridan to'liq foydalaning</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-10 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <Info className="w-6 h-6" />
            </div>
            <div className="text-sm">
              <p className="font-bold text-amber-900">Demo Rejim Faol</p>
              <p className="text-amber-700">Hozirda to'lov tizimi test rejimida. "Upgrade" tugmasini bossangiz, hisobingiz bepul Pro-ga o'tadi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-3xl border-2 transition-all ${
                  plan.popular ? 'border-indigo-600 shadow-xl scale-105 z-10 bg-indigo-50/30' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> Eng ommabop
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 font-medium">so'm{plan.id !== 'free' ? '/oy' : ''}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{plan.description}</p>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`mt-1 p-0.5 rounded-full ${plan.popular ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={plan.isCurrent || (loading !== null)}
                  onClick={() => plan.priceId && handlePlanSelect(plan)}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    plan.isCurrent 
                      ? 'bg-gray-100 text-gray-400 cursor-default' 
                      : plan.popular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]'
                        : 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]'
                  }`}
                >
                  {loading === plan.priceId ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {plan.buttonText}
                      {!plan.isCurrent && <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-gray-50 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Xavfsiz to'lov</h4>
                <p className="text-sm text-gray-500">Barcha to'lovlar Stripe orqali xavfsiz amalga oshiriladi</p>
              </div>
            </div>
            <div className="flex items-center gap-6 opacity-50 grayscale">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6" referrerPolicy="no-referrer" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" referrerPolicy="no-referrer" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Pricing;
