<script setup lang="ts">
import { ref } from 'vue';
import { useWeb3 } from '@/composables/useWeb3';
import voting from '@snapshot-labs/snapshot.js/src/voting';
import { getIncentivesForProposal } from '../helpers/quicksnapContracts';
import { ExtendedSpace, Proposal, Results } from '../helpers/interfaces';
import { commify } from '../helpers/utils';
import ModalSnapshotIncentive from './ModalSnapshotIncentive.vue';
import ModalRewardIncentives from './ModalRewardIncentives.vue';
import { supportedChain } from '../helpers/supportedChains';
import { useConnectButton } from '../composables/onboard';
import BaseButton from "@/plugins/quicksnap-incentives/components/BaseButton.vue";

const props = defineProps<{ space: ExtendedSpace; proposal: Proposal }>();
const emit = defineEmits(['reload-proposal']);

useMeta({
  title: {
    key: 'metaInfo.space.proposal.title',
    params: {
      space: props.space.name,
      proposal: props.proposal.title
    }
  },
  description: {
    key: 'metaInfo.space.proposal.description',
    params: {
      body: props.proposal.body.slice(0, 160)
    }
  }
});

const route = useRoute();
const router = useRouter();
const { web3 } = useWeb3();
const { userAddress, connectedChain } = useConnectButton();
const { isMessageVisible, setMessageVisibility } = useFlaggedMessageStatus(
  route.params.id as string
);

const proposalId: string = route.params.id as string;
const environment = import.meta.env.VITE_ENV;

const modalOpen = ref(false);
const selectedChoices = ref<any>(null);
const loadedResults = ref(false);
const results = ref<Results | null>(null);

let modalIncentiveOpen = ref(false);
let currentIncentives = ref([]);
let incentivesLoading = ref(false);
let modalReward = ref(false);

const isAdmin = computed(() => {
  const admins = (props.space.admins || []).map(admin => admin.toLowerCase());
  return admins.includes(userAddress.value?.toLowerCase());
});

const isModerator = computed(() => {
  const moderators = (props.space.moderators || []).map(moderator =>
    moderator.toLowerCase()
  );
  return moderators.includes(userAddress.value?.toLowerCase());
});

const strategies = computed(
  // Needed for older proposal that are missing strategies
  () => props.proposal?.strategies ?? props.space.strategies
);

const browserHasHistory = computed(() => window.history.state.back);

const { modalAccountOpen, isModalPostVoteOpen } = useModal();
const { modalTermsOpen, termsAccepted, acceptTerms } = useTerms(props.space.id);

function clickVote() {
  !web3.value.account
    ? (modalAccountOpen.value = true)
    : !termsAccepted.value && props.space.terms
      ? (modalTermsOpen.value = true)
      : (modalOpen.value = true);
}

function reloadProposal() {
  emit('reload-proposal');
}

async function loadResults() {
  if (!props.proposal) return;
  await getIncentives();
  if (props.proposal.scores.length === 0) {
    const votingClass = new voting[props.proposal.type](
      props.proposal,
      [],
      strategies.value
    );
    results.value = {
      scores: votingClass.getScores(),
      scoresByStrategy: votingClass.getScoresByStrategy(),
      scoresTotal: votingClass.getScoresTotal()
    };
  } else {
    results.value = {
      scores: props.proposal.scores,
      scoresByStrategy: props.proposal.scores_by_strategy,
      scoresTotal: props.proposal.scores_total
    };
  }
  loadedResults.value = true;
}

function handleBackClick() {
  if (!browserHasHistory.value || browserHasHistory.value.includes('create'))
    return router.push({ name: 'spaceProposals' });
  return router.go(-1);
}

function handleChoiceQuery() {
  const choice = route.query.choice as string;
  if (userAddress.value && choice && props.proposal.state === 'active') {
    selectedChoices.value = parseInt(choice);
    clickVote();
  }
}

async function openIncentiveModal() {
  modalIncentiveOpen.value = true;
}

async function openRewardModal() {
  modalReward.value = true;
}

async function getIncentives() {
  incentivesLoading.value = true;
  currentIncentives.value = await getIncentivesForProposal(
    props.proposal.id,
    props.proposal.choices
  );
  incentivesLoading.value = false;
}

watch(
  userAddress,
  () => {
    handleChoiceQuery();
  },
  { immediate: true }
);

onMounted(() => {
  loadResults();
});

onMounted(() => setMessageVisibility(props.proposal.flagged));
</script>
<template #sidebar-right>
  <div v-if="!isMessageVisible" class="mt-4 space-y-4 lg:mt-0">
    <BaseBlock :loading="incentivesLoading" title="Incentives">
      <p class="mb-4">
        You can add a reward for voters that choose the desired option
      </p>
      <div v-if="currentIncentives.length > 0" class="mb-4">
        <h6>Current Incentives</h6>
        <div
          v-for="incentive in currentIncentives"
          :key="incentive"
          class="my-3"
        >
          <b>Vote - </b> <b>{{ incentive?.option }}</b>
          <span class="total_incentive mt-4 flex justify-between"
            ><b>Token </b>
            <b>{{ commify(incentive.amount) }} {{ incentive.symbol }}</b></span
          >
          <span class="total_rewards flex justify-between"
            ><b>Total Rewards </b>
            <b>${{ commify(incentive.dollarAmount, 3) }}</b></span
          >
        </div>
      </div>
      <BaseButton class="block w-full" primary @click="openIncentiveModal()"
        >Add Incentive
      </BaseButton>
      <br />
      <BaseButton class="block w-full" primary @click="openRewardModal()"
        >Check rewards</BaseButton
      >
    </BaseBlock>
  </div>
  <ModalSnapshotIncentive
    :proposal="proposal"
    :open="modalIncentiveOpen"
    @close="modalIncentiveOpen = false"
  />
  <ModalRewardIncentives
    :open="modalReward"
    @close="modalReward = false"
  />
</template>

<style scoped>
.important-notice {
  border-color: #ffbd00;
}

.total_incentive {
  border-top: 0.3px solid #8b949e4f;
  padding: 10px 0px 5px 0px;
}

.total_incentive b:first-child {
  color: #fff;
}

.total_rewards {
  border-bottom: 0.3px solid #8b949e4f;
  padding: 5px 0px 10px 0px;
}

.total_rewards b:first-child {
  color: #fff;
}
</style>
