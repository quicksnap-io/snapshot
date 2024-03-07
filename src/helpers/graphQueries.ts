import gql from 'graphql-tag';

export const INCENTIVES_BY_PROPOSAL_QUERY = gql`
  query RewardAddeds($id: String!) {
    rewardAddeds(where: { proposal: $id }) {
      id
      time
      rewarder
      proposal
      option
      reward_token
      amount
      startTime
      endTime
      blockNumber
      blockTimestamp
    }
  }
`;

export const CURRENT_SNAPSHOT_INCENTIVES = gql`
  query RewardAddeds($time: Int!, $skip: Int!) {
    rewardAddeds(
      first: 1000
      skip: $skip
      where: { startTime_lte: $time, endTime_gte: $time }
    ) {
      id
      time
      rewarder
      proposal
      option
      reward_token
      amount
      startTime
      endTime
      blockNumber
      blockTimestamp
    }
  }
`;
