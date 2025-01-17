export class GraphQLClient {
    constructor(token) {
        this.endpoint = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';
        this.token = token;
        console.log('GraphQL Client initialized with token:', token); // Debug log
    }

    async query(query, variables) {
        try {
            console.log('Making GraphQL request with query:', query, 'and variables:', variables); // Debug log
            
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ query, variables })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('GraphQL HTTP error:', errorText); // Debug log
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('GraphQL response:', result); // Debug log
            
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            return result;
        } catch (error) {
            console.error('GraphQL query failed:', error);
            throw error;
        }
    }
}

export const GET_USER_DATA = `
  query($userId: Int!) {
    user(where: { id: { _eq: $userId } }) {
      id
      login
      xp_transactions: transactions(
        where: { 
          userId: { _eq: $userId },
          type: { _eq: "xp" },
          eventId: { _eq: 20 }
        },
        order_by: { createdAt: desc }
      ) {
        id
        amount
        createdAt
        path
        object {
          id
          name
          type
        }
      }
      recent_audits: transactions(
        where: {
          userId: { _eq: $userId },
          type: { _eq: "up" }
        },
        order_by: { createdAt: desc }
      ) {
        id
        amount
        createdAt
        path
        object {
          id
          name
        }
      }
      progresses(
        where: { 
          userId: { _eq: $userId },
          object: { type: { _eq: "project" } }
        },
        order_by: { updatedAt: desc }
      ) {
        id
        grade
        createdAt
        updatedAt
        object {
          id
          name
          type
        }
        path
      }
      audits_aggregate(
        where: { 
          auditorId: { _eq: $userId }
        },
        order_by: { endAt: desc }
      ) {
        nodes {
          grade
          createdAt
          closedAt
          endAt
          group {
            object {
              name
            }
          }
        }
      }
    }
  }
`;
