import { expect, haveResource } from '@aws-cdk/assert';
import iam = require('@aws-cdk/aws-iam');
import kms = require('@aws-cdk/aws-kms');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { Test } from 'nodeunit';
import secretsmanager = require('../lib');

export = {
  'default secret'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();

    // WHEN
    new secretsmanager.Secret(stack, 'Secret');

    // THEN
    expect(stack).to(haveResource('AWS::SecretsManager::Secret', {
      GenerateSecretString: {}
    }));

    test.done();
  },

  'grantRead'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const key = new kms.EncryptionKey(stack, 'KMS');
    const secret = new secretsmanager.Secret(stack, 'Secret', { encryptionKey: key });
    const role = new iam.Role(stack, 'Role', { assumedBy: new iam.AccountRootPrincipal() });

    // WHEN
    secret.grantRead(role);

    // THEN
    expect(stack).to(haveResource('AWS::IAM::Policy', {
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'secretsmanager:GetSecretValue',
          Effect: 'Allow',
          Resource: { Ref: 'SecretA720EF05' },
        }]
      }
    }));
    expect(stack).to(haveResource('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: [{
          Action: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
            "kms:Update*",
            "kms:Revoke*",
            "kms:Disable*",
            "kms:Get*",
            "kms:Delete*",
            "kms:ScheduleKeyDeletion",
            "kms:CancelKeyDeletion"
          ],
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":iam::",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":root"
                ]
              ]
            }
          },
          Resource: "*"
        }, {
          Action: "kms:Decrypt",
          Condition: {
            StringEquals: {
              "kms:ViaService": {
                "Fn::Join": [
                  "",
                  [
                    "secretsmanager.",
                    {
                      Ref: "AWS::Region"
                    },
                    ".amazonaws.com"
                  ]
                ]
              }
            }
          },
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::GetAtt": [
                "Role1ABCC5F0",
                "Arn"
              ]
            }
          },
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
      }
    }));
    test.done();
  },

  'grantRead with version label constraint'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const key = new kms.EncryptionKey(stack, 'KMS');
    const secret = new secretsmanager.Secret(stack, 'Secret', { encryptionKey: key });
    const role = new iam.Role(stack, 'Role', { assumedBy: new iam.AccountRootPrincipal() });

    // WHEN
    secret.grantRead(role, ['FOO', 'bar']);

    // THEN
    expect(stack).to(haveResource('AWS::IAM::Policy', {
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'secretsmanager:GetSecretValue',
          Effect: 'Allow',
          Resource: { Ref: 'SecretA720EF05' },
          Condition: {
            'ForAnyValue:StringEquals': {
              'secretsmanager:VersionStage': ['FOO', 'bar'],
            },
          },
        }]
      }
    }));
    expect(stack).to(haveResource('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: [{
          Action: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
            "kms:Update*",
            "kms:Revoke*",
            "kms:Disable*",
            "kms:Get*",
            "kms:Delete*",
            "kms:ScheduleKeyDeletion",
            "kms:CancelKeyDeletion"
          ],
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":iam::",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":root"
                ]
              ]
            }
          },
          Resource: "*"
        }, {
          Action: "kms:Decrypt",
          Condition: {
            StringEquals: {
              "kms:ViaService": {
                "Fn::Join": [
                  "",
                  [
                    "secretsmanager.",
                    {
                      Ref: "AWS::Region"
                    },
                    ".amazonaws.com"
                  ]
                ]
              }
            }
          },
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::GetAtt": [
                "Role1ABCC5F0",
                "Arn"
              ]
            }
          },
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
      }
    }));
    test.done();
  },

  'toSecretString'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const key = new kms.EncryptionKey(stack, 'KMS');
    const secret = new secretsmanager.Secret(stack, 'Secret', { encryptionKey: key });

    // WHEN
    new cdk.CfnResource(stack, 'FakeResource', {
      type: 'CDK::Phony::Resource',
      properties: {
        value: secret.stringValue
      }
    });

    // THEN
    expect(stack).to(haveResource('CDK::Phony::Resource', {
      value: {
        'Fn::Join': ['', [
          '{{resolve:secretsmanager:',
          { Ref: 'SecretA720EF05' },
          ':SecretString:::}}'
        ]]
      }
    }));
    test.done();
  },

  'import'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const encryptionKey = new kms.EncryptionKey(stack, 'KMS');
    const secretArn = 'arn::of::a::secret';

    // WHEN
    const secret = secretsmanager.Secret.import(stack, 'Secret', {
      secretArn, encryptionKey
    });

    // THEN
    test.equals(secret.secretArn, secretArn);
    test.same(secret.encryptionKey, encryptionKey);
    test.done();
  },

  'attached secret'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const secret = new secretsmanager.Secret(stack, 'Secret');
    const target: secretsmanager.ISecretAttachmentTarget = {
      asSecretAttachmentTarget: () => ({
        targetId: 'instance',
        targetType: secretsmanager.AttachmentTargetType.Instance
      })
    };

    // WHEN
    secret.addTargetAttachment('AttachedSecret', { target });

    // THEN
    expect(stack).to(haveResource('AWS::SecretsManager::SecretTargetAttachment', {
      SecretId: {
        Ref: 'SecretA720EF05'
      },
      TargetId: 'instance',
      TargetType: 'AWS::RDS::DBInstance'
    }));

    test.done();
  },

  'add a rotation schedule to an attached secret'(test: Test) {
    // GIVEN
    const stack = new cdk.Stack();
    const secret = new secretsmanager.Secret(stack, 'Secret');
    const target: secretsmanager.ISecretAttachmentTarget = {
      asSecretAttachmentTarget: () => ({
        targetId: 'cluster',
        targetType: secretsmanager.AttachmentTargetType.Cluster
      })
    };
    const attachedSecret = secret.addTargetAttachment('AttachedSecret', { target });
    const rotationLambda = new lambda.Function(stack, 'Lambda', {
      runtime: lambda.Runtime.NodeJS810,
      code: lambda.Code.inline('export.handler = event => event;'),
      handler: 'index.handler'
    });

    // WHEN
    attachedSecret.addRotationSchedule('RotationSchedule', {
      rotationLambda
    });

    // THEN
    expect(stack).to(haveResource('AWS::SecretsManager::RotationSchedule', {
      SecretId: {
        Ref: 'SecretAttachedSecret94145316' // The secret returned by the attachment, not the secret itself.
      }
    }));

    test.done();
  }
};
