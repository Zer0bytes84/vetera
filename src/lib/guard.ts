/**
 * `try / catch / finally` pour le code d'un composant ou d'un hook.
 *
 * Le compilateur React ne sait pas traduire un `try … finally`, un `try` sans `catch` ni un `throw` dans un `try … catch`
 * lorsqu'ils sont écrits dans un composant : il abandonne le composant entier, qui n'est alors plus analysé par les règles
 * « compilateur ». Ces fonctions portent la même instruction hors du composant, où elle n'est pas compilée. La sémantique est
 * celle de l'instruction d'origine :
 *
 * - une erreur levée par `run` est transmise à `recover` ; sans `recover`, elle est relancée telle quelle ;
 * - une erreur levée par `recover` ou par `cleanup` se propage à l'appelant ;
 * - `cleanup` s'exécute toujours, après `run` ou après `recover`, avant que l'appelant reprenne ;
 * - la valeur rendue est celle de `run`, ou celle de `recover` quand il a rattrapé une erreur.
 *
 * `guardSync` est la forme sans `await` : elle s'exécute de façon synchrone, comme l'instruction d'origine.
 */
export interface GuardSteps<E> {
  /** Le bloc `catch`. */
  recover?: (error: unknown) => E | Promise<E>;
  /** Le bloc `finally`. */
  cleanup?: () => void | Promise<void>;
}

export async function guard<T, E = never>(run: () => T | Promise<T>, steps: GuardSteps<E> = {}): Promise<T | E> {
  try {
    return await run();
  } catch (error) {
    if (!steps.recover) throw error;
    return await steps.recover(error);
  } finally {
    const done = steps.cleanup?.();
    if (done) await done;
  }
}

export function guardSync<T, E = never>(run: () => T, steps: { recover?: (error: unknown) => E; cleanup?: () => void } = {}): T | E {
  try {
    return run();
  } catch (error) {
    if (!steps.recover) throw error;
    return steps.recover(error);
  } finally {
    steps.cleanup?.();
  }
}
