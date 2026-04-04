let subscription = null;
export const setPushSubscription = (next) => {
    subscription = next;
};
export const getPushSubscription = () => subscription;
