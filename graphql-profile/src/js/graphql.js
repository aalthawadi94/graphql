export class GraphQLClient {
    constructor() {
        this.endpoint = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';
        this.token = null;
    }

    setToken(token) {
        this.token = token;
        console.log('GraphQL Client token updated:', token);
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
  query($userId: Int!, $eventId: Int!) {
    user(where: {id: {_eq: $userId}}) {
      id
      login
      firstName
      lastName
      email
      auditRatio
      totalUp
      totalDown
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
      audits: audits_aggregate(
        where: {
          auditorId: {_eq: $userId},
          grade: {_is_null: false}
        },
        order_by: {createdAt: desc}
      ) {
        nodes {
          id
          grade
          createdAt
          group {
            captainLogin
            object {
              name
            }
          }
        }
      }
      progresses(where: { userId: { _eq: $userId }, object: { type: { _eq: "project" } } }, order_by: {updatedAt: desc}) {
        id
        object {
          id
          name
          type
        }
        grade
        createdAt
        updatedAt
      }
      skills: transactions(
        where: {
          userId: {_eq: $userId},
          type: {_like: "skill_%"},
          amount: {_gt: 0}
        }
        order_by: [{amount: desc}]
      ) {
        type
        amount
      }
    }
    event_user(where: { userId: { _eq: $userId }, eventId: {_eq: $eventId}}) {
      level
    }
  }
`;
