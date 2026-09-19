import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';

export const LETTER = {
  greeting: 'Dear Haritha,',
  paragraphs: [
    {
      text: 'There are things I have carried quietly, not because they were small, but because they mattered too much to place in ordinary conversation.',
      photo: {
        src: '/images/image1.jpeg',
        alt: 'A memory waiting for its photograph',
        label: 'photo one',
      },
    },
    {
      text: 'Somewhere between the first familiar silence and the last light in the evening, you became part of the way I notice the world. A song lingers longer. Rain feels like an invitation. Even the quiet has a name now.',
      photo: {
        src: '/images/image2.jpeg',
        alt: 'A second memory waiting for its photograph',
        label: 'photo two',
      },
    },
    {
      text: 'I love the patience in you, the warmth you leave behind without trying, and the way being understood can feel like coming home without having to explain the journey.',
    },
  ],
  ending: 'With all of that being said',
  birthday: 'Happy 21st Birthday Honeybun',
} as const;

const REVEAL_PARTS = [
  LETTER.greeting,
  ...LETTER.paragraphs.map((paragraph) => paragraph.text),
  LETTER.ending,
];
const REVEAL_SEQUENCE = REVEAL_PARTS.join('');
const TITLE_LENGTH = LETTER.greeting.length;
const REVEAL_DELAY = 12;
const TITLE_PAUSE = 900;
const FINALE_PAUSE = 650;

type Phase = 'opening' | 'moving' | 'reading';

function getSectionProgress(revealedCount: number, sectionIndex: number) {
  const sectionStart = REVEAL_PARTS
    .slice(0, sectionIndex)
    .reduce((total, part) => total + part.length, 0);
  const sectionText = REVEAL_PARTS[sectionIndex];

  return Math.max(0, Math.min(sectionText.length, revealedCount - sectionStart));
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function CharacterText({
  text,
  offset,
  className = '',
}: {
  text: string;
  offset: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {Array.from(text).map((character, index) => (
        <span
          className="revealed-character"
          style={{ '--character-index': index, '--character-offset': offset + index } as CSSProperties}
          key={`${offset}-${index}`}
        >
          {character}
        </span>
      ))}
    </span>
  );
}

function PhotoSlot({
  src,
  alt,
  label,
  visible,
}: {
  src: string;
  alt: string;
  label: string;
  visible: boolean;
}) {
  if (src) {
    return (
      <div
        className={`photo-slot photo-reveal ${visible ? 'is-visible' : ''}`}
        aria-label={alt}
      >
        <img className="photo-image" src={src} alt={alt} />
      </div>
    );
  }

  return (
    <div
      className={`photo-slot photo-placeholder photo-reveal ${visible ? 'is-visible' : ''}`}
      aria-label={alt}
    >
      <span>{label}</span>
    </div>
  );
}

function App() {
  const [revealedCount, setRevealedCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('opening');
  const [showBirthday, setShowBirthday] = useState(false);
  const revealLock = useRef(false);
  const transitionTimer = useRef<number | undefined>(undefined);
  const finaleTimer = useRef<number | undefined>(undefined);
  const sectionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const endingRef = useRef<HTMLDivElement | null>(null);
  const autoScrolledParagraphs = useRef(new Set<number>());
  const totalRevealLength = REVEAL_SEQUENCE.length;

  const revealNext = useCallback(() => {
    if (
      revealLock.current ||
      revealedCount >= totalRevealLength ||
      phase === 'moving' ||
      showBirthday
    ) {
      return;
    }

    revealLock.current = true;
    window.setTimeout(() => {
      revealLock.current = false;
    }, REVEAL_DELAY);

    setRevealedCount((current) => Math.min(current + 1, totalRevealLength));
  }, [phase, revealedCount, showBirthday, totalRevealLength]);

  useEffect(() => {
    if (phase !== 'opening' || revealedCount < TITLE_LENGTH) {
      return;
    }

    setPhase('moving');
  }, [phase, revealedCount]);

  useEffect(() => {
    if (phase !== 'moving') {
      return;
    }

    transitionTimer.current = window.setTimeout(() => {
      setPhase('reading');
    }, TITLE_PAUSE);

    return () => {
      if (transitionTimer.current) {
        window.clearTimeout(transitionTimer.current);
      }
    };
  }, [phase]);

  useEffect(() => {
    if (revealedCount < totalRevealLength || showBirthday) {
      return;
    }

    finaleTimer.current = window.setTimeout(() => {
      setShowBirthday(true);
    }, FINALE_PAUSE);

    return () => {
      if (finaleTimer.current) {
        window.clearTimeout(finaleTimer.current);
      }
    };
  }, [revealedCount, showBirthday, totalRevealLength]);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        window.clearTimeout(transitionTimer.current);
      }
      if (finaleTimer.current) {
        window.clearTimeout(finaleTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab') {
        return;
      }
      if (event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace') {
        revealNext();
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (phase !== 'reading' || showBirthday) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, [phase, revealNext, showBirthday]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      event.preventDefault();
      revealNext();
    }
  };

  const titleText = LETTER.greeting.slice(0, Math.min(revealedCount, TITLE_LENGTH));
  const titleChars = Array.from(titleText);
  const paragraphProgress = useMemo(
    () =>
      LETTER.paragraphs.map((_, index) =>
        getSectionProgress(revealedCount, index + 1),
      ),
    [revealedCount],
  );
  const endingProgress = getSectionProgress(
    revealedCount,
    LETTER.paragraphs.length + 1,
  );

  useEffect(() => {
    if (phase !== 'reading' || showBirthday) {
      return;
    }

    const completedIndex = paragraphProgress.findIndex(
      (progress, index) =>
        progress >= LETTER.paragraphs[index].text.length &&
        !autoScrolledParagraphs.current.has(index),
    );

    if (completedIndex < 0) {
      return;
    }

    autoScrolledParagraphs.current.add(completedIndex);
    const nextSection =
      completedIndex < LETTER.paragraphs.length - 1
        ? sectionRefs.current[completedIndex + 1]
        : endingRef.current;

    nextSection?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [paragraphProgress, phase, showBirthday]);

  return (
    <main
      className={`love-letter ${phase} ${showBirthday ? 'finale-visible' : ''}`}
      onPointerDown={onPointerDown}
      data-testid="love-letter-canvas"
      aria-label="Interactive hidden love letter"
    >
      <p
        className={`instruction ${revealedCount > 0 ? 'instruction-hidden' : ''}`}
        data-testid="text-instruction"
      >
        type anything
      </p>

      <div className="opening-title" aria-live="polite" data-testid="text-title">
        {titleChars.map((character, index) => (
          <span
            className="revealed-character"
            style={{ '--character-index': index } as CSSProperties}
            key={`title-${index}`}
          >
            {character}
          </span>
        ))}
      </div>

      {phase !== 'opening' && (
        <section className="letter-copy" data-testid="text-letter">
          {LETTER.paragraphs.map((paragraph, index) => {
            const visibleText = paragraph.text.slice(0, paragraphProgress[index]);
            const contentOffset =
              TITLE_LENGTH +
              LETTER.paragraphs
                .slice(0, index)
                .reduce((total, item) => total + item.text.length, 0);
            const totalWords = countWords(paragraph.text);
            const visibleWords = countWords(visibleText);
            const photoVisible =
              'photo' in paragraph &&
              visibleWords >= Math.ceil(totalWords / 2);

            if (!('photo' in paragraph)) {
              return (
                <div
                  className="letter-section paragraph-3 centered-section"
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  key={`paragraph-${index}`}
                >
                  <div className="section-copy">
                    <CharacterText text={visibleText} offset={contentOffset} />
                  </div>
                </div>
              );
            }

            return (
              <div
                className={`letter-section paragraph-${index + 1}`}
                ref={(element) => {
                  sectionRefs.current[index] = element;
                }}
                key={`paragraph-${index}`}
              >
                <div className="section-copy">
                  <CharacterText text={visibleText} offset={contentOffset} />
                </div>
                <PhotoSlot {...paragraph.photo} visible={photoVisible} />
              </div>
            );
          })}
          <div className="letter-ending" ref={endingRef}>
            <CharacterText
              text={LETTER.ending.slice(0, endingProgress)}
              offset={REVEAL_SEQUENCE.length - LETTER.ending.length}
            />
          </div>
        </section>
      )}

      <div className="birthday-screen" aria-live="assertive">
        <p className="birthday-message">{LETTER.birthday}</p>
      </div>
    </main>
  );
}

export default App;
