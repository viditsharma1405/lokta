import { useState, useCallback } from 'react';
import type { BorrowerProfile } from './types/profile';
import type { CopilotOutput } from './types/calculations';
import { runCopilot } from './engine/index';
import { buildProfileFromAnswers, type Answers } from './questions/questionEngine';
import { PERSONAS } from './data/personas';
import Questionnaire from './components/questionnaire/Questionnaire';
import ResultsDashboard from './components/results/ResultsDashboard';
import NegotiationCardView from './components/negotiation/NegotiationCard';
import LandingHero from './components/common/LandingHero';

type AppView = 'landing' | 'questionnaire' | 'results' | 'negotiation';

function App() {
  const [view, setView] = useState<AppView>('landing');
  const [profile, setProfile] = useState<BorrowerProfile | null>(null);
  const [output, setOutput] = useState<CopilotOutput | null>(null);
  const [personaName, setPersonaName] = useState<string>('');

  const handleStartAssessment = useCallback(() => {
    setPersonaName('');
    setView('questionnaire');
    window.scrollTo(0, 0);
  }, []);

  const handleLoadPersona = useCallback((name: 'priya' | 'ravi' | 'anita') => {
    const p = PERSONAS[name];
    setProfile(p);
    setOutput(runCopilot(p));
    setPersonaName(name.charAt(0).toUpperCase() + name.slice(1));
    setView('results');
    window.scrollTo(0, 0);
  }, []);

  const handleQuestionnaireComplete = useCallback((answers: Answers) => {
    const p = buildProfileFromAnswers(answers);
    setProfile(p);
    setOutput(runCopilot(p));
    setPersonaName('');
    setView('results');
    window.scrollTo(0, 0);
  }, []);

  const handleBackToLanding = useCallback(() => {
    setView('landing');
    setProfile(null);
    setOutput(null);
    window.scrollTo(0, 0);
  }, []);

  const handleShowNegotiationCard = useCallback(() => {
    setView('negotiation');
    window.scrollTo(0, 0);
  }, []);

  const handleBackToResults = useCallback(() => {
    setView('results');
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#18181b]">
      {/* Header */}
      <header className="bg-white border-b border-[#eae3d9] sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
          <button
            onClick={handleBackToLanding}
            title="Go to Home"
            aria-label="Home"
            className="w-9 h-9 rounded-xl border border-[#eae3d9] bg-[#faf7f2] hover:bg-[#f4e7f0] text-[#5a2045] flex items-center justify-center transition-all cursor-pointer shadow-xs hover:border-[#e8d0e0] group active:scale-95"
          >
            <svg
              className="w-4.5 h-4.5 fill-none stroke-current stroke-2 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>
          {view !== 'landing' && (
            <button
              onClick={handleBackToLanding}
              className="text-xs sm:text-sm text-[#5a2045] hover:text-[#4b1a39] font-semibold cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-[#f4e7f0] transition-colors active:bg-[#ebd8e5]"
            >
              ← Start Over
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-2 sm:pt-3 pb-8">
        {view === 'landing' && (
          <LandingHero
            onStart={handleStartAssessment}
            onLoadPersona={handleLoadPersona}
          />
        )}

        {view === 'questionnaire' && (
          <Questionnaire onComplete={handleQuestionnaireComplete} />
        )}

        {view === 'results' && profile && output && (
          <ResultsDashboard
            profile={profile}
            output={output}
            personaName={personaName}
            onShowCard={handleShowNegotiationCard}
          />
        )}

        {view === 'negotiation' && profile && output && (
          <NegotiationCardView
            profile={profile}
            output={output}
            personaName={personaName}
            onBack={handleBackToResults}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#eae3d9] mt-12 py-6 text-center text-xs text-[#71717a] no-print">
        <p>Lokta Borrower Copilot — Turn lending judgement into rules a borrower can see.</p>
        <p className="mt-1">No backend. No API keys. No personal data stored. Works entirely offline.</p>
      </footer>
    </div>
  );
}

export default App;
