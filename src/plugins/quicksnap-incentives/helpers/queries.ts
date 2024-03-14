import gql from 'graphql-tag';

export const PROPOSAL_REDUCED_QUERY = gql`
  query Proposal($id: String!) {
    proposal(id: $id) {
      title
      choices
      network
      type
      space {
        id
        name
      }
    }
  }
`;

export const TOKEN_DATA_FOR_CHAIN = gql`
    query TokenDataForChain($token: String!, $chainName: String!) {
        tokenDataForChain(token: $token, chainName: $chainName) {
            logo
            name
            price
            symbol
        }
    }
`;

