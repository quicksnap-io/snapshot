<script setup>
import { onMounted, onUnmounted, reactive } from 'vue';
import { commify, shorten } from '@/helpers/utils';
import { getRewards, claimReward, claimAllRewards } from '@/helpers/rewards';
import { supportedChain } from '@/helpers/supportedChains';

const { userTheme } = useSkin();

const { connectedChain } = useConnectButton();

const themeBefore = userTheme?.value;

const state = reactive({
  rewardsLoading: true,
  rewards: [],
  totalRewards: 0,
  showRewards: false,
  claimData: { totalBalance: 0, totalClaimed: 0 },
  claiming: false,
  rewardClaimedMessage: '',
  rewardClaimFailedMessage: false
});

async function loadRewards() {
  console.log('loadRewards');
  state.rewardsLoading = true;
  const data = await getRewards();
  const { rewards, claimInfo } = data;
  console.log(rewards);
  let totalRewards = 0;
  for (let i = 0; i < rewards.length; i++) {
    totalRewards += rewards[i].claimable * rewards[i].rewardTokenPrice;
  }
  state.totalRewards = totalRewards;
  state.claimData = claimInfo;
  state.rewards = rewards;
  state.rewardsLoading = false;
}

async function claim(reward) {
  try {
    state.claiming = reward.claimData.token + reward.claimData.index.toString();
    await claimReward(reward);
    state.rewardClaimedMessage =
      reward.claimData.token + reward.claimData.index.toString();
    state.claiming = '';
    await loadRewards();
  } catch (e) {
    state.claiming = '';
    state.rewardClaimFailedMessage = true;
  }
}

async function claimAll() {
  try {
    state.claiming = 'all';
    await claimAllRewards(state.rewards);
    state.rewardClaimedMessage = 'all';
    state.claiming = '';
    await loadRewards();
  } catch (e) {
    state.claiming = '';
    state.rewardClaimFailedMessage = true;
  }
}

onMounted(() => {
   userTheme.value = "dark";
  setTimeout(() => {
    loadRewards();
  }, '500');
});

onUnmounted(() => {
  userTheme.value = themeBefore;
});
</script>

<template>
  <div>
    <div id="content" class="flex h-full">
      <BaseContainer class="w-full">
        <div class="">
          <h2>Claim rewards</h2>
          <p>
            These rewards are automatically reserved on your behalf, allowing
            you to claim them at your convenience without any time constraints.
            You have the option to claim all your rewards at once or to claim
            them individually. However, we recommend claiming them all together
            to minimize gas expenses
          </p>
        </div>
        <div
          class="space-content-between grid w-full gap-4 pb-4 pt-4 text-[20px] md:grid-cols-2 lg:grid-cols-3"
          style="width: 100%"
        >
          <div class="text-left">
            <p>Total all spaces unclaimed rewards</p>
            <p>$ {{ commify(state.claimData.totalBalance, 2) }}</p>
          </div>
          <div class="text-left">
            <p>Total all spaces claimed rewards</p>
            <p>$ {{ commify(state.claimData.totalClaimed, 2) }}</p>
          </div>
        </div>

        <div>
          <BaseBlock class="p-2" :slim="true">
            <BaseContainer
              class="flex flex-col flex-wrap items-center text-[24px] xs:flex-row md:flex-nowrap"
            >
              Yours to claim:
              <div class="pl-1 text-white">
                ${{ commify(state.totalRewards, 2) }}
              </div>
              <div
                class="mt-2 whitespace-nowrap text-right text-skin-text xs:ml-auto xs:mt-0"
              >
                <BaseButton
                  :loading="state.claiming === 'all'"
                  :disabled="
                    state.rewards.length < 2 ||
                    !supportedChain.get(parseInt(connectedChain?.id || '0', 16))
                  "
                  @click="claimAll()"
                  >claim all
                </BaseButton>
              </div>
            </BaseContainer>
          </BaseBlock>
        </div>

        <BaseContainer class="mb-4 mt-4 w-full">
          <div class="">
            <p class="text-center">
              Once the vote closes, your rewards will be calculated and updated
              the next day at 1PM UTC.
            </p>
          </div>
        </BaseContainer>

        <BaseContainer class="mt-4" :slim="true">
          <TransitionGroup
            v-if="!state.rewardsLoading"
            name="fade"
            tag="div"
            class="grid gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            <div
              v-for="reward in state.rewards"
              :key="reward.rewardToken.address"
            >
              <BaseBlock
                class="mb-0 flex justify-center text-center transition-all hover:border-skin-text"
                style="height: 300px"
              >
                <div class="relative mb-2 inline-block">
                  <BaseAvatar
                    :src="reward.rewardTokenLogo"
                    size="82"
                    class="mb-1"
                  />
                </div>
                <div class="relative mb-2 block">
                  <p>{{ reward.rewardToken.symbol }}</p>
                </div>

                <div class="mb-4 mt-4 grid grid-cols-2 text-[16px]">
                  <div class="text-left">Reward</div>
                  <div class="text-right">
                    {{ shorten(commify(reward.claimable), 12) }}
                  </div>
                  <div class="text-left">USD value</div>
                  <div class="text-right">
                    {{
                      '$' +
                      commify(reward.claimable * reward.rewardTokenPrice, 2)
                    }}
                  </div>
                </div>

                <BaseButton
                  :loading="
                    state.claiming ===
                    reward.claimData.token + reward.claimData.index.toString()
                  "
                  :disabled="
                    !supportedChain.get(parseInt(connectedChain?.id || '0', 16))
                  "
                  class="!mb-0"
                  @click="claim(reward)"
                  >claim
                </BaseButton>
              </BaseBlock>
            </div>
          </TransitionGroup>
          <ExploreSkeletonLoading v-if="state.rewardsLoading" is-spaces />
          <BaseNoResults
            v-if="state.rewards.length < 1 && !state.rewardsLoading"
            custom-text="No Rewards found"
            use-block
          />
          <ModalNotice
            :open="state.rewardClaimedMessage !== ''"
            title="Claimed!"
            @close="state.rewardClaimedMessage = ''"
          >
            <p>
              {{
                state.rewardClaimedMessage === 'all'
                  ? 'Your rewards have been claimed'
                  : 'Your reward has been claimed'
              }}
            </p>
          </ModalNotice>
          <ModalNotice
            :open="state.rewardClaimFailedMessage"
            title="Error"
            @close="state.rewardClaimFailedMessage = false"
          >
            <p>
              Something has gone wrong, please check your inputs and try again
              later.
            </p>
          </ModalNotice>
        </BaseContainer>
      </BaseContainer>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
