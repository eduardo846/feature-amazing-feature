import { create } from 'zustand';
import type { MultiSigState, MultiSigTask, MultiSigSigner } from '../types';

const createSigner = (id: string, name: string, status: MultiSigState['signers'][0]['status']): MultiSigSigner => ({
  id,
  name,
  role: id === 'initiator' ? 'Initiator' : 'Approver',
  status,
});

const initialTasks: MultiSigTask[] = [
  {
    id: 'ms-001',
    title: 'Creator royalty disbursement',
    amount: '1,800 XLM',
    description: 'Multi-sig approval required for high-value creator payout.',
    status: 'pending',
    signers: [
      createSigner('initiator', 'Amelia', 'approved'),
      createSigner('signer-1', 'Priya', 'pending'),
      createSigner('signer-2', 'Jaxon', 'pending'),
    ],
    queuedApprovals: [],
  },
];

export const useMultiSigStore = create<MultiSigState>((set) => ({
  tasks: initialTasks,

  queueApproval: (taskId, signerId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              queuedApprovals: task.queuedApprovals.includes(signerId)
                ? task.queuedApprovals
                : [...task.queuedApprovals, signerId],
            },
      ),
    }));

    window.setTimeout(() => {
      useMultiSigStore.getState().approveSigner(taskId, signerId);
    }, 1600);
  },

  approveSigner: (taskId, signerId) => {
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const signers = task.signers.map((signer) =>
          signer.id !== signerId
            ? signer
            : {
                ...signer,
                status: 'approved',
              },
        );

        const pending = signers.some((signer) => signer.status === 'pending');
        return {
          ...task,
          signers,
          status: pending ? 'pending' : 'approved',
          queuedApprovals: task.queuedApprovals.filter((id) => id !== signerId),
        };
      }),
    }));
  },
}));
