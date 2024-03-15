<script setup lang="ts">
import { ref } from 'vue';
import { ethers } from 'ethers';
import {
  addSnapshotRewardAmount,
  approveToken,
  getRawAllowance,
  tokenData,
  getTokenBalance,
  getRawTokenBalance
} from '../helpers/quicksnapContracts';
import { Proposal } from '../helpers/interfaces';
import { isAddress } from '@ethersproject/address';
import { call, clone } from '@snapshot-labs/snapshot.js/src/utils';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ERC20ABI } from '../helpers/abi';
import { supportedChain } from '../helpers/supportedChains';
import { getDecimals } from '../helpers/utils';
import {useConnectButton} from "../composables/onboard";
import InputString from "@/plugins/quicksnap-incentives/components/InputString.vue";
import BaseButton from "@/plugins/quicksnap-incentives/components/BaseButton.vue";
import ChoicesListbox from "@/plugins/quicksnap-incentives/components/ChoicesListbox.vue";


const { connectedChain, getChainInfo } = useConnectButton();

const DEFAULT_TOKEN = {
  name: '',
  logo: '',
  standard: 'ERC-20',
  symbol: '',
  decimals: null,
  price: 0
};

const isTokenLoading = ref(false);
let rewardToken = ref('');
let rewardAmount = ref('0');
let rewardOption = ref(1);
let tokenError = ref({ message: '', push: false });
let amountError = ref({ message: '', push: false });
let showRewardAddedMessage = ref(false);
let showRewardErrorMessage = ref(false);
let isApproved = ref(false);
let isApproveLoading = ref(false);
let isRewardLoading = ref(false);
const token = ref(clone(DEFAULT_TOKEN));
let availableAmount = ref('0');
let rewardAllOptions = ref(false);

const props = defineProps<{
  open: boolean;
  title?: string;
  showCancel?: boolean;
  disabled?: boolean;
  proposal: Proposal;
}>();

const emit = defineEmits(['close', 'confirm']);

const { open, proposal } = toRefs(props);
console.log(proposal);

async function addReward() {
  console.log(rewardToken.value, rewardAmount.value, rewardOption.value);
  tokenError.value.message = '';
  amountError.value.message = '';

  if (!ethers.utils.isAddress(rewardToken.value)) {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }

  if (token.value.price == 0 && import.meta.env.VITE_ENV !== 'develop') {
    tokenError.value.message =
      'this token is not supported as incentives token';
    isApproved.value = false;
    return;
  }

  if (
    isNaN(+rewardAmount.value) ||
    parseFloat(rewardAmount.value) <= 0 ||
    rewardAmount.value.split('.')[1]?.length > token.value.decimals
  ) {
    amountError.value.message = 'Please enter a valid token amount';
    return;
  }

  isRewardLoading.value = true;
  try {
    await addSnapshotRewardAmount(
      props.proposal.id,
      rewardAllOptions.value ? ethers.constants.MaxUint256 : rewardOption.value,
      rewardAmount.value,
      rewardToken.value,
      props.proposal.start,
      props.proposal.end
    );

    showRewardAddedMessage.value = true;
    rewardAmount.value = '0';
    rewardToken.value = '';
    rewardOption.value = 1;
    isRewardLoading.value = false;
    emit('close');
  } catch (e) {
    emit('close');
    showRewardErrorMessage.value = true;
    console.log(e);
    isRewardLoading.value = false;
  }
}

async function checkAllowance() {
  amountError.value.message = '';
  try {
    if (!ethers.utils.isAddress(rewardToken.value)) {
      tokenError.value.message = 'Please enter a valid token address';
      isApproved.value = false;
      return;
    }

    if (token.value.price == 0 && import.meta.env.VITE_ENV !== 'develop') {
      tokenError.value.message =
        'This token is not available on the blockchain you are using';
      isApproved.value = false;
      return;
    }

    if (
      isNaN(+rewardAmount.value) ||
      parseFloat(rewardAmount.value) <= 0 ||
      rewardAmount.value.split('.')[1]?.length > token.value.decimals
    ) {
      amountError.value.message = 'Please enter a valid token amount';
      return;
    }

    const allowance = await getRawAllowance(
      rewardToken.value,
      getChainInfo().quicksnapAddress
    );

    const balance = await getRawTokenBalance(rewardToken.value);
    const rawRewardAmount = ethers.utils.parseUnits(
      rewardAmount.value.toString(),
      token.value.decimals
    );

    if (balance.gte(rawRewardAmount)) {
      isApproved.value = true;
    } else {
      isApproved.value = false;
      amountError.value.message = 'Amount is bigger than balance';
      return;
    }

    if (allowance.gte(rawRewardAmount)) {
      isApproved.value = true;
    } else {
      isApproved.value = false;
      return;
    }
  } catch (e) {
    console.log(e);
    isApproved.value = false;
  }
}

async function setMax() {
  try {
    rewardAmount.value = await getTokenBalance(rewardToken.value);
  } catch (e) {
    console.log(e);
  }
}

async function approve() {
  if (!ethers.utils.isAddress(rewardToken.value)) {
    tokenError.value.message = 'Please enter a valid token address';
    return;
  }
  isApproveLoading.value = true;
  try {
    isApproved.value = await approveToken(
      rewardToken.value,
      getChainInfo().quicksnapAddress
    );
    isApproveLoading.value = false;
    await checkAllowance();
  } catch (e) {
    console.log(e);
    isApproveLoading.value = false;
  }
}

async function getTokenInfo() {
  if (!rewardToken.value || !isAddress(rewardToken.value)) {
    tokenError.value.message = 'invalid address';
    token.value = clone(DEFAULT_TOKEN);
    return;
  }

  isTokenLoading.value = true;

  availableAmount.value = await getTokenBalance(rewardToken.value);

  // get the reward token price
  const { success, price, name, symbol, logo, decimals } = await tokenData(
    rewardToken.value
  );
  console.log('success', success);
  if (!success) {
    token.value.price = 0;
    tokenError.value.message =
      'This token is not available on the blockchain you are using';
  } else {
    token.value.price = price;

    if (name) {
      token.value.name = name;
      token.value.logo = logo;
      token.value.symbol = symbol;
      token.value.decimals = decimals;
      isTokenLoading.value = false;
    } else {
      try {
        const provider = new JsonRpcProvider(getChainInfo().rpcUrl);
        const tokenInfo = await Promise.all([
          call(provider, ERC20ABI, [rewardToken.value, 'name', []]),
          call(provider, ERC20ABI, [rewardToken.value, 'symbol', []]),
          call(provider, ERC20ABI, [rewardToken.value, 'decimals', []])
        ]);
        token.value.name = tokenInfo[0];
        token.value.symbol = tokenInfo[1];
        token.value.decimals = tokenInfo[2];
      } catch (e) {
        console.log(e);
        tokenError.value.message = 'Token not found';
        token.value = clone(DEFAULT_TOKEN);
      } finally {
        isTokenLoading.value = false;
      }
    }
  }
}

function checkMinimumAmount() {
  console.log('get token price....');
  console.log(token.value.price);
  const rewardDollarAmount = token.value.price * parseFloat(rewardAmount.value);

  if (rewardDollarAmount < 1) {
    amountError.value.message = `Incentives must be at least $1 in value, now it is $${rewardDollarAmount}`;
  }
  return;
}

watch(
  [rewardToken],
  async () => {
    tokenError.value.message = '';
    if (import.meta.env.VITE_ENV !== 'develop') {
      await getTokenInfo();
    }
    await checkAllowance();
  },
  { deep: true }
);

watch(
  [rewardAmount],
  async () => {
    tokenError.value.message = '';
    amountError.value.message = '';
    await checkAllowance();
    if (import.meta.env.VITE_ENV !== 'develop') {
      checkMinimumAmount();
    }
  },
  { deep: true }
);
const toggleAllOptions = () => {
  rewardAllOptions.value = !rewardAllOptions.value;
};
</script>

<template>
  <BaseModal
    :open="open"
    class="incentive_modal"
    max-height="700px"
    @close="$emit('close')"
  >
    <template #header>
      <h1 class="text-md font-semibold">Add incentive</h1>
      <BaseContainer class="base_container p-2">
        <InputString
          v-model="rewardToken"
          class="mb-2"
          :definition="{ title: 'token address' }"
          :error="tokenError"
        />

        <div class="shadow-sm incentive_amount relative mt-2 flex rounded-md">
          <div class="available_amount">
            <span>available :</span>
            <span>
              {{
                getDecimals(availableAmount) > 10
                  ? parseFloat(availableAmount).toFixed(10)
                  : availableAmount
              }}</span
            >
          </div>
          <div class="relative flex flex-grow items-stretch focus-within:z-10">
            <inputString
              v-model="rewardAmount"
              class="mb-2"
              :definition="{ title: 'incentive amount' }"
              :error="amountError"
            />
          </div>
          <BaseButton
            :disabled="token.name === ''"
            class="primary mt-4"
            @click="setMax()"
          >Max
          </BaseButton>
        </div>

        <div class="option_checkbox">
          <input
            :checked="rewardAllOptions"
            type="checkbox"
            class="form-checkbox h-[19px] w-[19px]"
            @change="toggleAllOptions"
          />
          <label>Add incentives for Voting on any option</label>
        </div>
        <ChoicesListbox
          v-model="rewardOption"
          :items="proposal.choices"
          label="preferred option"
          :disable-input="rewardAllOptions"
        />
        <BaseBlock v-if="token.name" class="!mt-3 space-x-1 text-left text-sm">
          <div class="flex justify-between">
            <div class="flex items-center gap-1 truncate">
              <AvatarToken
                v-if="token.logo"
                :src="token.logo"
                :address="rewardToken"
                class="mr-1"
                size="30"
              />
              <div class="truncate">
                <div class="mr-4 truncate whitespace-nowrap text-skin-link">
                  {{ token.name }}
                </div>
                <BasePill class="py-1">${{ token.symbol }}</BasePill>
              </div>
            </div>
            <div class="flex items-center">
              <BaseLink
                class="text-skin-text hover:text-skin-link"
                :link="`${
                  getChainInfo().explorerBase || 'https://etherscan.io/'
                }token/${rewardToken}`"
              >
                See on explorer
              </BaseLink>
            </div>
          </div>
        </BaseBlock>
        <BaseMessageBlock
          v-if="token.name != '' && parseFloat(rewardAmount) > 0"
          class="mt-4 text-left"
          level="warning"
        >
          Note: This action is irreversible. <br />
          Once incentives are added, they cannot be withdrawn. Please ensure
          everything is correct before proceeding.
          <BaseLink
            link="https://quicksnap.gitbook.io/quicksnap-documentation/how-it-works/provide-incentives"
          >
            {{ $t('learnMore') }}
          </BaseLink>
        </BaseMessageBlock>
        <BaseButton
          :disabled="
            !supportedChain.get(parseInt(connectedChain?.id || '0', 16)) ||
            isApproved ||
            tokenError.message !== ''
          "
          :loading="isApproveLoading"
          class="primary mr-4 mt-4"
          @click="approve()"
        >Approve token
        </BaseButton>
        <BaseButton
          :disabled="
            !supportedChain.get(parseInt(connectedChain?.id || '0', 16)) ||
            !isApproved ||
            tokenError.message !== '' ||
            amountError.message !== '' ||
            parseFloat(rewardAmount) <= 0
          "
          :loading="isRewardLoading"
          class="primary ml-4 mt-4"
          @click="addReward()"
        >Add Incentive
        </BaseButton>
      </BaseContainer>
    </template>
  </BaseModal>
  <ModalNotice
    :open="showRewardAddedMessage"
    title="Done!"
    @close="showRewardAddedMessage = false"
  >
    <p>
      Your incentive will be added in a few minutes when confirmed by the
      blockchain
    </p>
  </ModalNotice>
  <ModalNotice
    :open="showRewardErrorMessage"
    title="Error"
    @close="showRewardErrorMessage = false"
  >
    <p>
      Something has gone wrong, please check your inputs and try again later.
    </p>
  </ModalNotice>
</template>
<style scoped>
.available_amount {
  position: absolute;
  right: 5px;
  top: 0px;
  min-width: 150px;
  display: flex;
  gap: 3px;
}

.option_checkbox {
  display: flex;
  margin: 15px 0px;
}

.option_checkbox label {
  margin-left: 10px;
}
</style>