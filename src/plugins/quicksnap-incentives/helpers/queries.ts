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

