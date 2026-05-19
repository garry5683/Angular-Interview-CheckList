import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { checklistData } from '../data/checklistData';
import { CheckSquare, Square, ChevronDown, ChevronRight, LogOut, LogIn } from 'lucide-react';

export default function Checklist() {
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'checklistState', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCheckedItems(data.checkedItems || {});
            setExpandedSections(data.expandedSections || {});
          }
        } catch (e) {
          console.error(e);
          setErrorMessage('Failed to load your progress from Firebase.');
        }
      } else {
        const saved = localStorage.getItem('angularChecklist');
        if (saved) {
          const data = JSON.parse(saved);
          setCheckedItems(data.checkedItems || {});
          setExpandedSections(data.expandedSections || {});
        }
      }
    });
  }, []);

  const toggleItem = async (itemId: string) => {
    const newChecked = { ...checkedItems, [itemId]: !checkedItems[itemId] };
    setCheckedItems(newChecked);
    const newState = { checkedItems: newChecked, expandedSections };
    if (user) {
      try {
        await setDoc(doc(db, 'checklistState', user.uid), newState, { merge: true });
      } catch (e) {
        console.error(e);
        setErrorMessage('Failed to save progress.');
      }
    } else {
      localStorage.setItem('angularChecklist', JSON.stringify(newState));
    }
  };

  const toggleSection = async (sectionId: string) => {
    const newExpanded = { ...expandedSections, [sectionId]: !expandedSections[sectionId] };
    setExpandedSections(newExpanded);
    const newState = { checkedItems, expandedSections: newExpanded };
    if (user) {
      try {
        await setDoc(doc(db, 'checklistState', user.uid), newState, { merge: true });
      } catch (e) {
        console.error(e);
        setErrorMessage('Failed to save progress.');
      }
    } else {
      localStorage.setItem('angularChecklist', JSON.stringify(newState));
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to sign in.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to sign out.');
    }
  };

  const filteredData = checklistData
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(section => section.items.length > 0);

  const totalItems = checklistData.reduce((acc, section) => acc + section.items.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progress = (checkedCount / totalItems) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Angular Interview Checklist</h1>
            <p className="text-slate-500 mt-2">A comprehensive roadmap to prepare for your Angular frontend interview.</p>
          </div>
          {user ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <LogOut size={16} /> Sign Out
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <LogIn size={16} /> Sign In to Sync
            </button>
          )}
        </div>
        
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
          </div>
        )}
        
        <div className="mt-6 flex gap-4">
          <input
            type="text"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
            <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {filteredData.map((section) => (
          <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:border-slate-300">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-6 bg-white transition-all hover:bg-slate-100 hover:shadow-inner cursor-pointer"
            >
              <h2 className="text-lg font-bold text-slate-800">{section.title}</h2>
              {expandedSections[section.id] ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
            </button>
            <AnimatePresence>
              {expandedSections[section.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/50">
                    <ul className="space-y-3">
                      {section.items.map((item, index) => {
                        const itemId = `${section.id}-${index}`;
                        return (
                          <li key={itemId} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm transition-all hover:border-indigo-200">
                            <button onClick={() => toggleItem(itemId)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${checkedItems[itemId] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                              {checkedItems[itemId] && <span className="text-white text-[12px] font-bold">✓</span>}
                            </button>
                            <span className={`text-sm font-medium ${checkedItems[itemId] ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {item}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
