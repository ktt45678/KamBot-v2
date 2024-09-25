export const quoteMessageSchema = {
  optionalProperties: {
    content: {
      type: 'string'
    },
    embeds: {
      elements: {
        optionalProperties: {
          title: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          author: {
            optionalProperties: {
              name: {
                type: 'string'
              },
              url: {
                type: 'string'
              },
              icon_url: {
                type: 'string'
              }
            }
          },
          color: {
            type: 'string'
          },
          footer: {
            optionalProperties: {
              text: {
                type: 'string'
              },
              icon_url: {
                type: 'string'
              }
            }
          },
          thumbnail: {
            type: 'string'
          },
          image: {
            type: 'string'
          },
          fields: {
            elements: {
              properties: {
                name: {
                  type: 'string'
                },
                value: {
                  type: 'string'
                }
              },
              optionalProperties: {
                inline: {
                  type: 'boolean'
                }
              }
            }
          }
        }
      }
    }
  }
};