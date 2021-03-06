import cdk = require('@aws-cdk/cdk');
import { BaseInstanceProps, InstanceBase } from './instance';
import { NamespaceType } from './namespace';
import { DnsRecordType, IService, RoutingPolicy } from './service';
import { CfnInstance } from './servicediscovery.generated';

/*
 * Properties for an AliasTargetInstance
 */
export interface AliasTargetInstanceProps extends BaseInstanceProps {
  /**
   * DNS name of the target
   */
  dnsName: string;

  /**
   * The Cloudmap service this resource is registered to.
   */
  service: IService;
}

/*
 * Instance that uses Route 53 Alias record type. Currently, the only resource types supported are Elastic Load
 * Balancers.
 */
export class AliasTargetInstance extends InstanceBase {
  /**
   * The Id of the instance
   */
  public readonly instanceId: string;

  /**
   * The Cloudmap service to which the instance is registered.
   */
  public readonly service: IService;

  /**
   * The Route53 DNS name of the alias target
   */
  public readonly dnsName: string;

  constructor(scope: cdk.Construct, id: string, props: AliasTargetInstanceProps) {
    super(scope, id);

    if (props.service.namespace.type === NamespaceType.Http) {
      throw new Error('Namespace associated with Service must be a DNS Namespace.');
    }

    // Should already be enforced when creating service, but validates if service is not instantiated with #createService
    const dnsRecordType = props.service.dnsRecordType;
    if (dnsRecordType !== DnsRecordType.A
      && dnsRecordType !== DnsRecordType.AAAA
      && dnsRecordType !== DnsRecordType.A_AAAA) {
      throw new Error('Service must use `A` or `AAAA` records to register an AliasRecordTarget.');
    }

    if (props.service.routingPolicy !== RoutingPolicy.Weighted) {
      throw new Error('Service must use `WEIGHTED` routing policy.');
    }

    const resource = new CfnInstance(this, 'Resource', {
      instanceAttributes: {
        AWS_ALIAS_DNS_NAME: props.dnsName,
        ...props.customAttributes
      },
      instanceId: props.instanceId || this.node.uniqueId,
      serviceId: props.service.serviceId
    });

    this.service = props.service;
    this.instanceId = resource.instanceId;
    this.dnsName = props.dnsName;
  }
}
